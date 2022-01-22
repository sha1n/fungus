import { v4 as uuid } from 'uuid';
import { DirectedGraph } from './DirectedGraph';
import { ServiceController } from './ServiceController';
import { Identifiable, EnvContext, Service, ServiceDescriptor, ServiceId } from './types';
import { Logger, createLogger } from './logger';

type InternalEnvContext = {
  readonly name: string;
  readonly services: Map<ServiceId, ServiceDescriptor<unknown>>;
};

class Environment implements Identifiable {
  private servicesGraph = new ServiceGraph();
  private ctx: InternalEnvContext;
  private logger: Logger;
  readonly id: string;

  constructor(name?: string) {
    this.id = name || `env-${uuid()}`;
    this.logger = createLogger(this.id);
    this.ctx = {
      name: this.id,
      services: new Map<ServiceId, ServiceDescriptor<unknown>>()
    };
  }

  register(service: Service<unknown>, dependencies?: ReadonlyArray<Service<unknown>>): void {
    this.logger.info(`registering service ${service.id}`);
    const serviceController = this.getOrCreateControllerFor(service);
    this.servicesGraph.addService(serviceController);
    dependencies?.forEach(dep => {
      this.servicesGraph.addDependency(serviceController, this.getOrCreateControllerFor(dep));
    });
  }

  async start(): Promise<EnvContext> {
    return this.doStart(this.ctx);
  }

  async stop(): Promise<void> {
    return this.doStop(this.ctx);
  }

  private getOrCreateControllerFor(service: Service<unknown>): ServiceController<unknown> {
    return this.servicesGraph.getService(service.id) || new ServiceController(service);
  }

  private async doStart(ctx: InternalEnvContext): Promise<EnvContext> {
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
        service.prependOnceListener('started', (descriptor: ServiceDescriptor<unknown>, ctx: InternalEnvContext) => {
          // This is critical to avoid handling errors that occur after startup
          service.removeListener('error', onError);
          ctx.services.set(descriptor.id, descriptor);
          if (ctx.services.size === services.length) {
            resolve(ctx);
          }
        });
      }

      Promise.all(this.servicesGraph.getBootstrapServices().map(s => s.start(ctx).catch(this.logger.error)));
    });
  }

  private async doStop(ctx: EnvContext): Promise<void> {
    this.logger.info('stopping...');
    return Promise.allSettled(this.servicesGraph.getShutdownSequence().map(s => s.stop(ctx))).then(() => {
      return;
    });
  }
}

class ServiceGraph {
  private static logger = createLogger('srv-graph');

  private graph: DirectedGraph<ServiceController<unknown>> = new DirectedGraph<ServiceController<unknown>>();

  addService(service: ServiceController<unknown>): void {
    this.graph.addNode(service);
  }

  getService(id: string): ServiceController<unknown> {
    return this.graph.getNode(id);
  }

  addDependency(service: ServiceController<unknown>, dependency: ServiceController<unknown>): void {
    ServiceGraph.logger.info(`adding dependency: ${service.id} depends on ${dependency.id}`);
    this.graph.addEdge(dependency, service);
    // This is required in order to allow the controller to start once all deps are started.
    service.addDependency(dependency);

    if (!this.graph.isDirectAcyclic()) {
      throw new Error(`the dependency from ${service.id} to ${dependency.id} forms a cycle.`);
    }
    dependency.once('started', (descriptor: ServiceDescriptor<unknown>, ctx: EnvContext) =>
      service.onDependencyStarted(descriptor, ctx).catch(ServiceGraph.logger.error)
    );
  }

  getServices(): Array<ServiceController<unknown>> {
    return this.graph.getNodes();
  }

  getBootstrapServices(): Array<ServiceController<unknown>> {
    return this.graph.getRoots();
  }

  getShutdownSequence(): Array<ServiceController<unknown>> {
    return this.graph.reverseTopologicalSort();
  }
}

export { Environment };
