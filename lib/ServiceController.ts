import EventEmitter = require('events');
import { newLogger } from './logger';
import { Identifiable, EnvironmentContext, Service, ServiceDescriptor, ServiceID } from './types';

export class ServiceController extends EventEmitter implements Identifiable {
  private static logger = newLogger('srv-ctrl');

  private readonly pendingDependencies: Set<ServiceID>;
  private readonly startedDeps = new Map<ServiceID, ServiceDescriptor>();
  private descriptor: ServiceDescriptor = undefined;
  private starting = false;
  readonly id: string;

  constructor(readonly service: Service, ...deps: ReadonlyArray<ServiceID>) {
    super();
    this.pendingDependencies = new Set(...deps);
    this.id = service.id;
  }

  addDependency(dep: Service): void {
    this.pendingDependencies.add(dep.id);
  }

  async onDependencyStarted(serviceDescriptor: ServiceDescriptor, ctx: EnvironmentContext): Promise<void> {
    ServiceController.logger.debug(`dependency started: ${serviceDescriptor.id}`);
    this.startedDeps.set(serviceDescriptor.id, serviceDescriptor);
    this.pendingDependencies.delete(serviceDescriptor.id);
    if (this.pendingDependencies.size === 0 && !(this.isStarted() || this.starting)) {
      ServiceController.logger.debug('all dependencies are started');
      await this.start(ctx);
    }
  }

  readonly isStarted = (): boolean => {
    return this.descriptor !== undefined;
  };

  readonly isStopped = (): boolean => {
    return this.descriptor === undefined;
  };

  readonly start = async (ctx: EnvironmentContext): Promise<ServiceDescriptor> => {
    if (this.isStarted()) {
      return this.descriptor;
    }

    this.starting = true;
    return this.service
      .start(ctx)
      .then(meta => {
        const descriptor: ServiceDescriptor = {
          id: this.service.id,
          meta: meta
        };
        (ctx.services as Map<ServiceID, ServiceDescriptor>).set(descriptor.id, descriptor);
        this.emit('started', descriptor, ctx);
        this.descriptor = descriptor;
        return descriptor;
      })
      .catch(error => {
        this.emit('error', error);
        return Promise.reject(error);
      })
      .finally(() => {
        this.starting = false;
      });
  };

  readonly stop = async (ctx: EnvironmentContext): Promise<void> => {
    if (this.isStopped() && !this.starting) {
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
