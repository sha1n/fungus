import { v4 as uuid } from 'uuid';
import { DirectedGraph } from './DirectedGraph';
import { createLogger, Logger } from './logger';
import { ServiceController } from './ServiceController';
import { RuntimeContext, Identifiable, Service, ServiceDescriptor } from './types';

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

  register(service: Service<unknown>, dependencies?: ReadonlyArray<Service<unknown>>): void {
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

  private getOrCreateControllerFor(service: Service<unknown>): ServiceController<unknown> {
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
        service.prependOnceListener('started', (descriptor: ServiceDescriptor<unknown>, ctx: RuntimeContext) => {
          // This is critical to avoid handling errors that occur after startup
          service.removeListener('error', onError);
          ctx.register(descriptor);
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

  private readonly graph: DirectedGraph<ServiceController<unknown>> = new DirectedGraph<ServiceController<unknown>>();

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
    dependency.once('started', (descriptor: ServiceDescriptor<unknown>, ctx: RuntimeContext) =>
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
