import type { StateRepository, HandlerContext, Handler, TransitionHandler } from './types';

class DefaultTransitionHandler<T, S, C extends HandlerContext> implements TransitionHandler<T, S, C> {
  constructor(private readonly currentStatusHandler: Handler<T, C>, readonly targetState: S) {}

  async handle(entity: T, repository: StateRepository<T, S, C>, ctx: C): Promise<T> {
    let maybeModified = await this.currentStatusHandler.handle(entity, ctx);
    maybeModified = await repository.updateState(maybeModified, this.targetState, ctx);

    return maybeModified;
  }
}

export { DefaultTransitionHandler };
