import { v4 as uuid } from 'uuid';
import { DirectedGraph } from './DirectedGraph';
import { createLogger, Logger } from './logger';
import { ServiceController } from './ServiceController';
import { DependencyMap, Identifiable, RuntimeContext, Service, ServiceMetadata } from './types';

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

  start(): Promise<RuntimeContext> {
    return this.doStart(this.ctx);
  }

  stop(): Promise<void> {
    return this.doStop(this.ctx);
  }

  private getOrCreateControllerFor(service: Service): ServiceController {
    return this.servicesGraph.getService(service.id) || new ServiceController(service);
  }

  private async doStart(ctx: RuntimeContext): Promise<RuntimeContext> {
    this.logger.info('starting up...');
    const allStartedPromise = new Promise<RuntimeContext>((resolve, reject) => {
      const services = this.servicesGraph.getServices();

      for (const service of services) {
        service.prependOnceListener('error', reject);
        service.prependOnceListener('started', (metadata: ServiceMetadata, ctx: RuntimeContext) => {
          // This is critical to avoid handling errors that occur after startup
          service.removeListener('error', reject);
          ctx.register(metadata);
          if (ctx.services.size === services.length) {
            resolve(ctx);
          }
        });
      }

      Promise.allSettled(this.servicesGraph.getBootstrapServices().map(s => s.start(ctx)));
    });

    try {
      // await Promise.allSettled(this.servicesGraph.getBootstrapServices().map(s => s.start(ctx)));

      const result = await allStartedPromise;
      return result;
    } catch (e) {
      await this.stop().catch(this.logger.error);
      throw e;
    }
  }

  private async doStop(ctx: RuntimeContext): Promise<void> {
    this.logger.info('stopping...');
    await Promise.allSettled(this.servicesGraph.getShutdownSequence().map(s => s.stop(ctx)));
  }
}

class ServiceGraph {
  private readonly logger = createLogger('srv-graph');

  private readonly graph: DirectedGraph<ServiceController> = new DirectedGraph<ServiceController>();

  addService(service: ServiceController): void {
    this.graph.addNode(service);
  }

  getService(id: string): ServiceController {
    return this.graph.getNode(id);
  }

  addDependency(service: ServiceController, controller: ServiceController): void {
    this.logger.info(`adding dependency: ${service.id} depends on ${controller.id}`);
    this.graph.addEdge(controller, service);
    // This is required in order to allow the controller to start once all deps are started.
    service.addDependency(controller);

    if (!this.graph.isDirectAcyclic()) {
      throw new Error(`the dependency from ${service.id} to ${controller.id} forms a cycle.`);
    }
    controller.once('started', (metadata: ServiceMetadata, ctx: RuntimeContext) => {
      // An event emitter should trigger a promise rejection up the stack
      service.onDependencyStarted(metadata, ctx).catch(this.logger.error);
    });
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
    env.register(record.service, record.dependsOn);
  }

  return env;
}

export { type Environment, createEnvironment };
