import { v4 as uuid } from 'uuid';
import { DirectedGraph } from './DirectedGraph';
import { createLogger, Logger } from './logger';
import { ServiceController } from './ServiceController';
import { DependencyMap, RuntimeContext, Service, ServiceId, ServiceMetadata } from './types';

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

  unregister(id: ServiceId): void {
    this._serviceCatalog.delete(id);
  }
}

class Environment {
  private readonly servicesGraph = new ServiceGraph();
  private readonly ctx: InternalRuntimeContext;
  private readonly logger: Logger;

  constructor(name?: string) {
    const envName = name || `env-${uuid()}`;
    this.logger = createLogger(envName);
    this.ctx = new InternalRuntimeContext(envName);
  }

  register(service: Service, dependencies?: ReadonlyArray<Service>): void {
    this.logger.info('registering service %s', service.id);
    this.servicesGraph.addService(service);
    dependencies?.forEach(dep => {
      this.servicesGraph.addDependency(service, dep);
    });
  }

  start(): Promise<RuntimeContext> {
    return this.doStart(this.ctx);
  }

  stop(): Promise<void> {
    try {
      this.ctx.shuttingDown = true;
      return this.doStop(this.ctx);
    } finally {
      this.ctx.shuttingDown = false;
    }
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

    // The teardown algorithm traverses all the services in reverse topological order
    // to ensure that we stop as clean as possible, even if something fails
    const errors: Array<Error> = [];
    for (const service of this.servicesGraph.getTeardownServices()) {
      await service
        .stop(ctx)
        .catch(e => {
          errors.push(e);
          return Promise.resolve();
        })
        .finally(() => {
          ctx.unregister(service.id);
        });
    }

    if (errors.length > 0) {
      throw new Error(errors.map(e => e.message).join('\n'));
    }
  }
}

class ServiceGraph {
  private readonly logger = createLogger('srv-graph');

  private readonly graph: DirectedGraph<ServiceController> = new DirectedGraph<ServiceController>();

  addService(service: Service): void {
    this.graph.addNode(this.getOrCreateControllerFor(service));
  }

  addDependency(service: Service, dependency: Service): void {
    const srvController = this.getOrCreateControllerFor(service);
    const depController = this.getOrCreateControllerFor(dependency);

    this.logger.info('adding dependency: %s depends on %s', service.id, depController.id);
    this.graph.addEdge(depController, srvController);

    if (!this.graph.isDirectAcyclic()) {
      throw new Error(`the dependency from ${service.id} to ${dependency.id} forms a cycle.`);
    }
    // This is required in order to allow the controller to start once all deps are started.
    srvController.addDependency(depController);
  }

  getServices(): ServiceController[] {
    return this.graph.getNodes();
  }

  getBootstrapServices(): ServiceController[] {
    return this.graph.getRoots();
  }

  getTeardownServices(): ServiceController[] {
    return this.graph.reverseTopologicalSort();
  }

  private getOrCreateControllerFor(service: Service): ServiceController {
    return this.graph.getNode(service.id) || new ServiceController(service);
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

export { type Environment, InternalRuntimeContext, createEnvironment };
