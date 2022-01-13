import { Logger } from '../log';

type Stateful<S> = {
  getState(): S;
};

interface StateRepository<T, S, C extends HandlerContext> {
  updateState(entity: T, state: S, ctx: C): Promise<T>;
  updateFailed(entity: T, ctx: C): Promise<T>;
}

type HandlerContext = {
  logger: Logger
};

interface TransitionHandler<T, S, C extends HandlerContext> {
  handle(entity: T, repository: StateRepository<T, S, C>, ctx: C): Promise<T>;
}

interface Handler<T, C extends HandlerContext> {
  handle(entity: T, ctx: C): Promise<T>;
}

interface HandlerResolver<T, S, C extends HandlerContext> {
  resolveHandlerFor(state: S): TransitionHandler<T, S, C>;
}

type OnErrorHandler<T, C extends HandlerContext> = (error: Error, entity: T, ctx: C) => Promise<T>;
type OnBeforeHandler<T, C extends HandlerContext> = (entity: T, ctx: C) => Promise<T>;
type OnAfterHandler<T, C extends HandlerContext> = (entity: T, ctx: C) => Promise<void>;


export {
  Stateful,
  TransitionHandler,
  Handler,
  OnErrorHandler,
  OnBeforeHandler,
  OnAfterHandler,
  HandlerContext,
  StateRepository,
  HandlerResolver
};
