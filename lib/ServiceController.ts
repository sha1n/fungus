import assert = require('assert');
import EventEmitter = require('events');
import { InternalRuntimeContext } from './env';
import { createLogger } from './logger';
import { Service, ServiceId, ServiceMetadata } from './types';

const logger = createLogger('srv-ctrl');

class ServiceController extends EventEmitter {
  private readonly startPendingDependencies = new Set<ServiceId>();
  private startPromise: Promise<void>;
  private meta: ServiceMetadata = undefined;

  constructor(private readonly service: Service) {
    super();
  }

  get id(): string {
    return this.service.id;
  }

  addDependency(dependency: ServiceController): void {
    this.startPendingDependencies.add(dependency.id);

    dependency.once('started', (metadata: ServiceMetadata, ctx: InternalRuntimeContext) => {
      // An event emitter should trigger a promise rejection up the stack
      this.onDependencyStarted(metadata, ctx).catch(logger.error);
    });
  }

  readonly start = async (ctx: InternalRuntimeContext): Promise<void> => {
    if (this.isStarted()) {
      return;
    }

    return this.startPromise || (this.startPromise = this.doStart(ctx));
  };

  private async doStart(ctx: InternalRuntimeContext): Promise<void> {
    try {
      this.meta = await this.service.start(ctx);
      ctx.register(this.meta);
      this.emit('started', this.meta, ctx);
    } catch (e) {
      const hasListeners = this.emit('error', e);

      assert(hasListeners, 'A service controller is expected to have a listener at this point');
      throw e;
    } finally {
      this.startPromise = undefined;
    }
  }

  readonly stop = async (ctx: InternalRuntimeContext): Promise<void> => {
    logger.debug('%s: going to shutdown...', this.id);
    if (!this.isStarted() && !this.startPromise) {
      return;
    }

    try {
      if (this.startPromise) {
        logger.debug('%s: waiting for startup to finish...', this.id);
        await this.startPromise;
      }

      logger.debug('%s: stopping...', this.id);
      await this.service.stop(ctx);
      this.emit('stopped', this.service.id, ctx);
      this.meta = undefined;
    } catch (e) {
      this.emit('error', e);
      throw e;
    } finally {
      this.meta = undefined;
    }
  };

  private async onDependencyStarted(metadata: ServiceMetadata, ctx: InternalRuntimeContext): Promise<void> {
    logger.debug('%s: dependency started -> %s', this.id, metadata.id);
    this.startPendingDependencies.delete(metadata.id);

    assert(
      !this.isStarted() && !this.startPromise,
      `Unexpected internal state. starting=${this.startPromise !== undefined}, started=${this.isStarted()}`
    );

    if (this.startPendingDependencies.size === 0 && !ctx.shuttingDown) {
      logger.debug('%s: all dependencies are started', this.id);
      await this.start(ctx);
    }
  }

  private isStarted(): boolean {
    return this.meta !== undefined;
  }
}

export { ServiceController };
