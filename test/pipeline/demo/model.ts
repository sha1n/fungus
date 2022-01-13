import { v4 as uuid } from 'uuid';
import { HandlerContext, Stateful } from '../../../lib/pipeline/types';

enum TaskState {
  Submitted,
  Started,
  Completed,
  Failed,
  Cancelled
}

class Task implements Stateful<TaskState> {
  readonly id: string = uuid();
  state: TaskState = TaskState.Submitted;

  getState(): TaskState {
    return this.state;
  }
}

type TaskContext = {
  startTime?: number
  elapsedTime?: number
} & HandlerContext;

export { Task, TaskState, TaskContext };