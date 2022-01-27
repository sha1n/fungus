import assert = require('assert');
import EventEmitter = require('events');
import { createLogger } from './logger';
import { RuntimeContext, Service, ServiceId, ServiceMetadata } from './types';

const logger = createLogger('srv-ctrl');

class ServiceController extends EventEmitter {
  private readonly pendingDependencies: Set<ServiceId>;
  private readonly startedDeps = new Map<ServiceId, ServiceMetadata>();
  private meta: ServiceMetadata = undefined;
  private starting = false;
  readonly id: string;
  private startPromise: Promise<void>;

  constructor(readonly service: Service, ...deps: ReadonlyArray<ServiceId>) {
    super();
    this.pendingDependencies = new Set(...deps);
    this.id = service.id;
  }

  addDependency(dep: ServiceController): void {
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

  readonly start = async (ctx: RuntimeContext): Promise<void> => {
    if (this.isStarted() || this.startPromise) {
      return;
    }

    this.startPromise = this.doStart(ctx);

    return this.startPromise;
  };

  private async doStart(ctx: RuntimeContext): Promise<void> {
    try {
      this.meta = await this.service.start(ctx);
      ctx.register(this.meta);
      this.emit('started', this.meta, ctx);
    } catch (e) {
      const hasListeners = this.emit('error', e);

      assert(hasListeners, 'A service controller is expected to have a listener at this point');
      throw e;
    }
  }

  readonly stop = async (ctx: RuntimeContext): Promise<void> => {
    if (!this.isStarted()) {
      return;
    }

    try {
      if (this.startPromise) {
        await this.startPromise;
      }
      await this.service.stop(ctx);
      this.emit('stopped', this.service.id);
      this.meta = undefined;
    } catch (e) {
      this.emit('error', e);
      throw e;
    }
  };
}

export { ServiceController };
