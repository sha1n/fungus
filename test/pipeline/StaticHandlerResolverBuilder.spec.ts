import { NoopTransitionHandler } from '../../lib/pipeline/NoopTransitionHandler';
import { createStaticHandlerResolver } from '../../lib/pipeline/StaticHandlerResolverBuilder';
import { MyState } from './examples';
import { aMockHandler } from './mocks';
import type { DefaultTransitionHandler } from '../../lib/pipeline/DefaultTransitionHandler';
import type { HandlerContext } from '../../lib/pipeline/types';
import type { MyEntity } from './examples';

describe('StaticHandlerResolverBuilder', () => {
  test('should build', () => {
    const resolver = createStaticHandlerResolver()
      .withTransition(MyState.A, MyState.Completed, aMockHandler())
      .withDeadStates(MyState.Failed, MyState.Completed)
      .build();

    const handler = resolver.resolveHandlerFor(MyState.A) as DefaultTransitionHandler<
      MyEntity,
      MyState,
      HandlerContext
    >;
    expect(handler.targetState).toEqual(MyState.Completed);
    expect(resolver.resolveHandlerFor(MyState.Failed)).toEqual(NoopTransitionHandler);
    expect(resolver.resolveHandlerFor(MyState.Completed)).toEqual(NoopTransitionHandler);
  });
});
