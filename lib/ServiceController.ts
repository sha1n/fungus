import EventEmitter = require('events');
import { createLogger } from './logger';
import { RuntimeContext, Service, ServiceDescriptor, ServiceId } from './types';

const logger = createLogger('srv-ctrl');

class ServiceController<T> extends EventEmitter implements Service<T> {
  private readonly pendingDependencies: Set<ServiceId>;
  private readonly startedDeps = new Map<ServiceId, ServiceDescriptor<T>>();
  private descriptor: ServiceDescriptor<T> = undefined;
  private starting = false;
  readonly id: string;

  constructor(readonly service: Service<T>, ...deps: ReadonlyArray<ServiceId>) {
    super();
    this.pendingDependencies = new Set(...deps);
    this.id = service.id;
  }

  addDependency(dep: Service<T>): void {
    this.pendingDependencies.add(dep.id);
  }

  async onDependencyStarted(serviceDescriptor: ServiceDescriptor<T>, ctx: RuntimeContext): Promise<void> {
    logger.debug(`${this.id}: dependency started -> ${serviceDescriptor.id}`);
    this.startedDeps.set(serviceDescriptor.id, serviceDescriptor);
    this.pendingDependencies.delete(serviceDescriptor.id);
    if (this.pendingDependencies.size === 0 && !(this.isStarted() || this.starting)) {
      logger.debug(`${this.id}: all dependencies are started`);
      await this.start(ctx);
    }
  }

  readonly isStarted = (): boolean => {
    return this.descriptor !== undefined;
  };

  readonly start = async (ctx: RuntimeContext): Promise<T> => {
    if (this.isStarted()) {
      return this.descriptor.meta;
    }

    this.starting = true;
    return this.service
      .start(ctx)
      .then(meta => {
        const descriptor: ServiceDescriptor<T> = {
          id: this.service.id,
          meta: meta
        };
        ctx.register(descriptor);
        this.emit('started', descriptor, ctx);
        this.descriptor = descriptor;
        return descriptor.meta;
      })
      .catch(error => {
        this.emit('error', error);
        return Promise.reject(error);
      })
      .finally(() => {
        this.starting = false;
      });
  };

  readonly stop = async (ctx: RuntimeContext): Promise<void> => {
    if (!this.isStarted() && !this.starting) {
      return;
    }

    return this.service.stop(ctx).then(
      () => {
        this.emit('stopped', this.service.id);
        this.descriptor = undefined;
        return;
      },
      error => {
        this.emit('error', error);
        return Promise.reject(error);
      }
    );
  };
}

export { ServiceController };
