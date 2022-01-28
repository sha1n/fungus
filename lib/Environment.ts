import { v4 as uuid } from 'uuid';
import { DirectedGraph } from './DirectedGraph';
import { createLogger, Logger } from './logger';
import { ServiceController } from './ServiceController';
import { DependencyMap, Identifiable, RuntimeContext, Service, ServiceId, ServiceMetadata } from './types';

class InternalRuntimeContext implements RuntimeContext {
  private readonly _serviceCatalog = new Map();
  shuttingDown: boolean;

  constructor(readonly name: string) {}

  get serviceCatalog(): ReadonlyMap<ServiceId, ServiceMetadata> {
    return this._serviceCatalog;
  }

  register(metadata: ServiceMetadata): void {
    this._serviceCatalog.set(metadata.id, metadata);
  }
}

class Environment implements Identifiable {
  private readonly servicesGraph = new ServiceGraph();
  private readonly ctx: InternalRuntimeContext;
  private readonly logger: Logger;
  readonly id: string;

  constructor(name?: string) {
    this.id = name || `env-${uuid()}`;
    this.logger = createLogger(this.id);
    this.ctx = new InternalRuntimeContext(this.id);
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
    this.ctx.shuttingDown = true;
    return this.doStop(this.ctx);
  }

  private getOrCreateControllerFor(service: Service): ServiceController {
    return this.servicesGraph.getService(service.id) || new ServiceController(service);
  }

  private async doStart(ctx: InternalRuntimeContext): Promise<RuntimeContext> {
    this.logger.info('starting up...');
    const allStartedPromise = new Promise<RuntimeContext>((resolve, reject) => {
      const services = this.servicesGraph.getServices();

      for (const service of services) {
        service.prependOnceListener('error', error => {
          ctx.shuttingDown = true;
          reject(error);
        });
        service.prependOnceListener('started', (metadata: ServiceMetadata, ctx: InternalRuntimeContext) => {
          // This is critical to avoid handling errors that occur after startup
          service.removeListener('error', reject);
          ctx.register(metadata);
          if (ctx.serviceCatalog.size === services.length) {
            resolve(ctx);
          }
        });
      }

      Promise.allSettled(this.servicesGraph.getBootstrapServices().map(s => s.start(ctx)));
    });

    try {
      const result = await allStartedPromise;
      return result;
    } catch (e) {
      await this.stop().catch(this.logger.error);
      throw e;
    }
  }

  private async doStop(ctx: InternalRuntimeContext): Promise<void> {
    this.logger.info('stopping...');
    for (const service of this.servicesGraph.getShutdownSequence()) {
      await service.stop(ctx).catch(this.logger.error);
    }
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
    controller.once('started', (metadata: ServiceMetadata, ctx: InternalRuntimeContext) => {
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

export { type Environment, InternalRuntimeContext as InternalContext, createEnvironment };
