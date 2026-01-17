import { v4 as uuid } from 'uuid';
import createDAG from '@sha1n/dagraph';
import { createLogger, Logger } from './logger';
import { ServiceController } from './ServiceController';
import { ServiceSpec, Environment, RuntimeContext, Service, ServiceId, ServiceMetadata } from './types';

class InternalRuntimeContext implements RuntimeContext {
  private readonly _catalog = new Map<ServiceId, ServiceMetadata>();
  shuttingDown: boolean;

  constructor(readonly name: string) {}

  get catalog(): ReadonlyMap<ServiceId, ServiceMetadata> {
    return this._catalog;
  }

  register(metadata: ServiceMetadata): void {
    this._catalog.set(metadata.id, metadata);
  }

  unregister(id: ServiceId): void {
    this._catalog.delete(id);
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

  constructor(
    private readonly specs: readonly ServiceSpec[],
    name: string
  ) {
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
          if (ctx.catalog.size === services.length) {
            resolve(ctx);
          }
        });
      }

      void Promise.allSettled(serviceGraph.getBootstrapServices().map(s => s.start(ctx)));
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
    return new StartedEnv(this.servicesGraph, this.specs, this.ctx.name);
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

    for (const spec of this.specs) {
      register(spec.service, spec.dependsOn);
    }

    return servicesGraph;
  }
}

class StartedEnv {
  private readonly logger: Logger;
  private readonly ctx: InternalRuntimeContext;

  constructor(
    private readonly servicesGraph: ServiceGraph,
    private readonly specs: readonly ServiceSpec[],
    name: string
  ) {
    this.logger = createLogger(name);
    this.ctx = new InternalRuntimeContext(name);
  }

  async start(): Promise<[RuntimeContext, StartedEnv]> {
    return Promise.reject(new Error('Already started'));
  }

  async stop(): Promise<StoppedEnv> {
    await this.doStop(this.ctx);

    return new StoppedEnv(this.specs, this.ctx.name);
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

  private readonly graph = createDAG<ServiceController>();

  addService(service: Service): void {
    this.graph.addNode(this.getOrCreateControllerFor(service));
  }

  addDependency(service: Service, dependency: Service): void {
    const srvController = this.getOrCreateControllerFor(service);
    const depController = this.getOrCreateControllerFor(dependency);

    this.logger.info('adding dependency: %s depends on %s', service.id, depController.id);
    this.graph.addEdge(depController, srvController);

    // This is required in order to allow the controller to start once all deps are started.
    srvController.addDependency(depController);
  }

  getServices(): readonly ServiceController[] {
    return [...this.graph.nodes()];
  }

  getBootstrapServices(): readonly ServiceController[] {
    return [...this.graph.roots()];
  }

  getTeardownServices(): readonly ServiceController[] {
    return [...this.graph.reverse().topologicalSort()];
  }

  private getOrCreateControllerFor(service: Service): ServiceController {
    return this.graph.getNode(service.id) || new ServiceController(service);
  }
}

function createEnvironment(specs: readonly ServiceSpec[], options?: { name?: string }): Environment {
  const name = options?.name || `env-${uuid()}`;
  const stoppedEnv = new StoppedEnv(specs, name);
  let env: EnvState = stoppedEnv;

  return {
    name,

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
