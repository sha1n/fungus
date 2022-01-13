import { StateRepository } from '../../../lib/pipeline/types';
import { Task, TaskState, TaskContext } from './model';

class InMemoryStateRepository implements StateRepository<Task, TaskState, TaskContext> {
  private readonly tasks = new Map<string, Task>();

  async updateState(entity: Task, state: TaskState, ctx: TaskContext): Promise<Task> {
    ctx.logger.info(`Updating task state to ${state}`);

    this.tasks.set(entity.id, entity);
    entity.state = state;

    return entity;
  }
  async updateFailed(entity: Task, ctx: TaskContext): Promise<Task> {
    return this.updateState(entity, TaskState.Failed, ctx);
  }

}

export { InMemoryStateRepository };
