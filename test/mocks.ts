import { sleep, TimeUnit } from '@sha1n/about-time';
import { v4 as uuid } from 'uuid';
import { Service, ServiceMetadata } from '../lib/types';

function aServiceMock(failOnStart?: boolean, failOnStop?: boolean): [ServiceMock, ServiceMetadata] {
  const expectedId = uuid();

  return [new ServiceMock(expectedId, failOnStart, failOnStop), { id: expectedId }];
}

function aServiceMetadata(): ServiceMetadata {
  const expectedId = uuid();

  return { id: expectedId };
}

class StartError extends Error {
  constructor(message?: string) {
    super(message || 'synthetic-start-error');
  }
}
class StopError extends Error {
  constructor(message?: string) {
    super(message || 'synthetic-stop-error');
  }
}

class ServiceMock implements Service {
  public static startSequence = 0;
  public static stopSequence = 0;
  public startCalls = 0;
  public stopCalls = 0;
  public startIndex = NaN;
  public stopIndex = NaN;

  constructor(readonly id: string, readonly failOnStart?: boolean, readonly failOnStop?: boolean) {}

  async start(): Promise<ServiceMetadata> {
    this.startIndex = ServiceMock.startSequence++;
    this.startCalls++;
    if (this.failOnStart === true) {
      return Promise.reject(new StartError('synthetic-start-error'));
    }

    sleep(10, { units: TimeUnit.Milliseconds });
    return Promise.resolve({ id: this.id });
  }

  async stop(): Promise<void> {
    this.stopIndex = ServiceMock.stopSequence++;
    this.stopCalls++;
    if (this.failOnStop === true) {
      return Promise.reject(new StopError('synthetic-stop-error'));
    }
    return Promise.resolve();
  }
}

export { aServiceMock, aServiceMetadata, ServiceMock, StopError, StartError };
