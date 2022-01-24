import EventEmitter = require('events');
import { createLogger } from './logger';
import { RuntimeContext, Service, ServiceMetadata, ServiceId } from './types';

const logger = createLogger('srv-ctrl');

class ServiceController extends EventEmitter implements Service {
  private readonly pendingDependencies: Set<ServiceId>;
  private readonly startedDeps = new Map<ServiceId, ServiceMetadata>();
  private meta: ServiceMetadata = undefined;
  private starting = false;
  readonly id: string;

  constructor(readonly service: Service, ...deps: ReadonlyArray<ServiceId>) {
    super();
    this.pendingDependencies = new Set(...deps);
    this.id = service.id;
  }

  addDependency(dep: Service): void {
    this.pendingDependencies.add(dep.id);
  }

  async onDependencyStarted(metadata: ServiceMetadata, ctx: RuntimeContext): Promise<void> {
    logger.debug(`${this.id}: dependency started -> ${metadata.id}`);
    this.startedDeps.set(metadata.id, metadata);
    this.pendingDependencies.delete(metadata.id);
    if (this.pendingDependencies.size === 0 && !(this.isStarted() || this.starting)) {
      logger.debug(`${this.id}: all dependencies are started`);
      await this.start(ctx);
    }
  }

  readonly isStarted = (): boolean => {
    return this.meta !== undefined;
  };

  readonly start = async (ctx: RuntimeContext): Promise<ServiceMetadata> => {
    if (this.isStarted()) {
      return this.meta;
    }

    this.starting = true;
    return this.service
      .start(ctx)
      .then(meta => {
        ctx.register(meta);
        this.emit('started', meta, ctx);
        this.meta = meta;
        return meta;
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
        this.meta = undefined;
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
