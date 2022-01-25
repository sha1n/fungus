import { v4 as uuid } from 'uuid';
import { DirectedGraph } from './DirectedGraph';
import { createLogger, Logger } from './logger';
import { ServiceController } from './ServiceController';
import { RuntimeContext, Identifiable, Service, ServiceMetadata, DependencyMap } from './types';

class Environment implements Identifiable {
  private readonly servicesGraph = new ServiceGraph();
  private readonly ctx: RuntimeContext;
  private readonly logger: Logger;
  readonly id: string;

  constructor(name?: string) {
    this.id = name || `env-${uuid()}`;
    this.logger = createLogger(this.id);
    this.ctx = new RuntimeContext(this.id);
  }

  register(service: Service, dependencies?: ReadonlyArray<Service>): void {
    this.logger.info(`registering service ${service.id}`);
    const serviceController = this.getOrCreateControllerFor(service);
    this.servicesGraph.addService(serviceController);
    dependencies?.forEach(dep => {
      this.servicesGraph.addDependency(serviceController, this.getOrCreateControllerFor(dep));
    });
  }

  async start(): Promise<RuntimeContext> {
    return this.doStart(this.ctx);
  }

  async stop(): Promise<void> {
    return this.doStop(this.ctx);
  }

  private getOrCreateControllerFor(service: Service): ServiceController {
    return this.servicesGraph.getService(service.id) || new ServiceController(service);
  }

  private async doStart(ctx: RuntimeContext): Promise<RuntimeContext> {
    this.logger.info('starting up...');
    return new Promise((resolve, reject) => {
      const services = this.servicesGraph.getServices();
      const onError = (e: Error) => {
        this.doStop(ctx)
          .catch(this.logger.error)
          .finally(() => reject(e));
      };

      for (const service of services) {
        service.prependOnceListener('error', onError);
        service.prependOnceListener('started', (metadata: ServiceMetadata, ctx: RuntimeContext) => {
          // This is critical to avoid handling errors that occur after startup
          service.removeListener('error', onError);
          ctx.register(metadata);
          if (ctx.services.size === services.length) {
            resolve(ctx);
          }
        });
      }

      Promise.all(this.servicesGraph.getBootstrapServices().map(s => s.start(ctx).catch(this.logger.error)));
    });
  }

  private async doStop(ctx: RuntimeContext): Promise<void> {
    this.logger.info('stopping...');
    return Promise.allSettled(this.servicesGraph.getShutdownSequence().map(s => s.stop(ctx))).then(() => {
      return;
    });
  }
}

class ServiceGraph {
  private static readonly logger = createLogger('srv-graph');

  private readonly graph: DirectedGraph<ServiceController> = new DirectedGraph<ServiceController>();

  addService(service: ServiceController): void {
    this.graph.addNode(service);
  }

  getService(id: string): ServiceController {
    return this.graph.getNode(id);
  }

  addDependency(service: ServiceController, metadata: ServiceController): void {
    ServiceGraph.logger.info(`adding dependency: ${service.id} depends on ${metadata.id}`);
    this.graph.addEdge(metadata, service);
    // This is required in order to allow the controller to start once all deps are started.
    service.addDependency(metadata);

    if (!this.graph.isDirectAcyclic()) {
      throw new Error(`the dependency from ${service.id} to ${metadata.id} forms a cycle.`);
    }
    metadata.once('started', (metadata: ServiceMetadata, ctx: RuntimeContext) =>
      service.onDependencyStarted(metadata, ctx).catch(ServiceGraph.logger.error)
    );
  }

  getServices(): Array<ServiceController> {
    return this.graph.getNodes();
  }

  getBootstrapServices(): Array<ServiceController> {
    return this.graph.getRoots();
  }

  getShutdownSequence(): Array<ServiceController> {
    return this.graph.reverseTopologicalSort();
  }
}

function createEnvironment(map: DependencyMap, name?: string): Environment {
  const env = new Environment(name);

  for (const key of Object.keys(map)) {
    const record = map[key];
    env.register(record.service, record.dependencies);
  }

  return env;
}

export { type Environment, createEnvironment };
