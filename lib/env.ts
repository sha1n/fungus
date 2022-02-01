import { v4 as uuid } from 'uuid';
import { DirectedGraph } from './DirectedGraph';
import { createLogger, Logger } from './logger';
import { ServiceController } from './ServiceController';
import { DependencyMap, Environment, RuntimeContext, Service, ServiceId, ServiceMetadata } from './types';

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

type EnvState = {
  start(): Promise<[RuntimeContext, StartedEnv]>;
  stop(): Promise<StoppedEnv>;
};

class StoppedEnv {
  private readonly logger: Logger;
  private readonly ctx: InternalRuntimeContext;
  private readonly servicesGraph: ServiceGraph;

  constructor(private readonly map: DependencyMap, name: string) {
    this.logger = createLogger(name);
    this.ctx = new InternalRuntimeContext(name);
    this.servicesGraph = this.init();
  }

  async start(): Promise<[RuntimeContext, StartedEnv]> {
    const outCtx = await this.doStart(this.servicesGraph, this.ctx);

    return [outCtx, this.startedEnv()];
  }

  async stop(): Promise<StoppedEnv> {
    return Promise.reject(new Error('Not started'));
  }

  private async doStart(serviceGraph: ServiceGraph, ctx: InternalRuntimeContext): Promise<RuntimeContext> {
    this.logger.info('starting up...');
    const allStartedPromise = new Promise<RuntimeContext>((resolve, reject) => {
      const services = serviceGraph.getServices();
      const onError = (error: Error) => {
        ctx.shuttingDown = true;
        reject(error);
      };

      for (const service of services) {
        service.prependOnceListener('error', onError);
        service.prependOnceListener('started', (metadata: ServiceMetadata, ctx: InternalRuntimeContext) => {
          // This is critical to avoid handling errors that occur after startup
          service.removeListener('error', onError);
          ctx.register(metadata);
          if (ctx.serviceCatalog.size === services.length) {
            resolve(ctx);
          }
        });
      }

      Promise.allSettled(serviceGraph.getBootstrapServices().map(s => s.start(ctx)));
    });

    try {
      const result = await allStartedPromise;
      return result;
    } catch (e) {
      await this.startedEnv().stop().catch(this.logger.error);
      throw e;
    }
  }

  private startedEnv(): StartedEnv {
    return new StartedEnv(this.servicesGraph, this.map, this.ctx.name);
  }

  private init(): ServiceGraph {
    const servicesGraph = new ServiceGraph();

    const register = (service: Service, dependencies?: ReadonlyArray<Service>) => {
      this.logger.info('registering service %s', service.id);
      servicesGraph.addService(service);
      dependencies?.forEach(dep => {
        servicesGraph.addDependency(service, dep);
      });
    };

    for (const key of Object.keys(this.map)) {
      const record = this.map[key];
      register(record.service, record.dependsOn);
    }

    return servicesGraph;
  }
}

class StartedEnv {
  private readonly logger: Logger;
  private readonly ctx: InternalRuntimeContext;

  constructor(private readonly servicesGraph: ServiceGraph, private readonly map: DependencyMap, name: string) {
    this.logger = createLogger(name);
    this.ctx = new InternalRuntimeContext(name);
  }

  async start(): Promise<[RuntimeContext, StartedEnv]> {
    return Promise.reject(new Error('Already started'));
  }

  async stop(): Promise<StoppedEnv> {
    await this.doStop(this.ctx);

    return new StoppedEnv(this.map, this.ctx.name);
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
  const envName = name || `env-${uuid()}`;
  const stoppedEnv = new StoppedEnv(map, name);
  let env: EnvState = stoppedEnv;

  return {
    name: envName,

    start: async () => {
      const [ctx, startedEnv] = await env.start();
      env = startedEnv;

      return ctx;
    },

    stop: async () => {
      env = await env.stop();
    }
  };
}

export { InternalRuntimeContext, createEnvironment };
