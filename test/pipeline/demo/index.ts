import { newLogger } from '../../../lib/log';
import { createPipeline } from '../../../lib/pipeline/PipelineBuilder';
import { createStaticHandlerResolver } from '../../../lib/pipeline/StaticHandlerResolverBuilder';
import { InMemoryStateRepository } from './InMemoryStateRepository';
import { Task, TaskContext, TaskState } from './model';

const pipeline = createPipeline<Task, TaskState, TaskContext>()
  .withStateRepository(new InMemoryStateRepository())
  .withOnBeforeHandler(async (entity, ctx) => {
    ctx.startTime = Date.now();
    return entity;
  })
  .withOnAfterHandler(async (entity, ctx) => {
    ctx.elapsedTime = Date.now() - ctx.startTime;
  })
  .withHandlerResolver(
    createStaticHandlerResolver<Task, TaskState, TaskContext>()
      .withDeadStates(
        TaskState.Completed,
        TaskState.Failed,
        TaskState.Cancelled
      )
      .withTransition(TaskState.Submitted, TaskState.Started, {
        async handle(entity: Task, ctx: TaskContext): Promise<Task> {
          ctx.logger.info('Starting...');
          return entity;
        },
      })
      .withTransition(TaskState.Started, TaskState.Completed, {
        async handle(entity: Task, ctx: TaskContext): Promise<Task> {
          ctx.logger.info('Completing...');
          return entity;
        },
      })
      .build()
  )
  .build();

async function run() {
  let task = new Task();
  while (task.state !== TaskState.Completed) {
    task = await pipeline.handle(task, { logger: newLogger(`demo:task:run:${task.id}`) });
  }
}

export default run;
