import { AssertionError } from 'assert';
import { DefaultTransitionHandler } from '../../lib/pipeline/DefaultTransitionHandler';
import { NoopTransitionHandler } from '../../lib/pipeline/NoopTransitionHandler';
import { StaticHandlerResolver } from '../../lib/pipeline/StaticHandlerResolver';
import { NonRecoverablePipelineError } from '../../lib/pipeline/errors';
import { MyState } from './examples';
import { aMockHandler } from './mocks';
import type { HandlerContext } from '../../lib/pipeline/types';
import type { MyEntity } from './examples';

describe('StaticHandlerResolver', () => {
  describe('registerDeadState', () => {
    test('should throw when called with a state that has already been registered', () => {
      const resolver = new StaticHandlerResolver<MyEntity, MyState, HandlerContext>();

      resolver.registerTransition(MyState.A, MyState.B, aMockHandler());

      expect(() => resolver.registerDeadState(MyState.A)).toThrow(AssertionError);
    });

    test('should throw when called with a state that is already registered as dead state', () => {
      const resolver = new StaticHandlerResolver<MyEntity, MyState, HandlerContext>();

      resolver.registerDeadState(MyState.A);

      expect(() => resolver.registerDeadState(MyState.A)).toThrow(AssertionError);
    });

    test('should register a noop handler for the specified state', () => {
      const resolver = new StaticHandlerResolver<MyEntity, MyState, HandlerContext>();

      resolver.registerDeadState(MyState.A);

      expect(resolver.resolveHandlerFor(MyState.A)).toEqual(NoopTransitionHandler);
    });
  });

  describe('registerTransition', () => {
    test('should throw when called with a state that has already been registered', () => {
      const resolver = new StaticHandlerResolver<MyEntity, MyState, HandlerContext>();

      resolver.registerTransition(MyState.A, MyState.B, aMockHandler());

      expect(() => resolver.registerTransition(MyState.A, MyState.Failed, aMockHandler())).toThrow(AssertionError);
    });

    test('should throw when called with a state that is already registered as dead state', () => {
      const resolver = new StaticHandlerResolver<MyEntity, MyState, HandlerContext>();

      resolver.registerDeadState(MyState.A);

      expect(() => resolver.registerTransition(MyState.A, MyState.Failed, aMockHandler())).toThrow(AssertionError);
    });

    test(`should register a ${DefaultTransitionHandler.name} to transition from the 'from' to the 'to' state`, () => {
      const resolver = new StaticHandlerResolver<MyEntity, MyState, HandlerContext>();

      resolver.registerTransition(MyState.A, MyState.B, aMockHandler());

      const handler = resolver.resolveHandlerFor(MyState.A) as DefaultTransitionHandler<
        MyEntity,
        MyState,
        HandlerContext
      >;
      expect(handler.targetState).toEqual(MyState.B);
    });
  });

  describe('resolveHandlerFor', () => {
    test('should throw a non recoverable error if no handler is registered with the specified state', () => {
      const resolver = new StaticHandlerResolver();

      expect(() => resolver.resolveHandlerFor(MyState.A)).toThrow(NonRecoverablePipelineError);
    });
  });
});
