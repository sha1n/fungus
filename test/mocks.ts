import { v4 as uuid } from 'uuid';
import { Service, ServiceDescriptor } from '../lib/types';

export function newServiceMock(
  name: string,
  failOnStart?: boolean,
  failOnStop?: boolean
): [ServiceMock, ServiceDescriptor] {
  const expectedMeta = { name: name };
  const expectedId = uuid();

  return [
    new ServiceMock(expectedId, expectedMeta, failOnStart, failOnStop),
    { id: expectedId, meta: expectedMeta },
  ];
}

export interface ServiceMetaMock {
  readonly name: string;
}

export class StartError extends Error {
  constructor(message?: string) {
    super(message || 'synthetic-start-error');
  }
}
export class StopError extends Error {
  constructor(message?: string) {
    super(message || 'synthetic-stop-error');
  }
}

export class ServiceMock implements Service {
  public static startSequence = 0;
  public static stopSequence = 0;
  public startCalls = 0;
  public stopCalls = 0;
  public startIndex = NaN;
  public stopIndex = NaN;

  constructor(
    readonly id: string,
    readonly meta: ServiceMetaMock,
    readonly failOnStart?: boolean,
    readonly failOnStop?: boolean
  ) {}

  async start(): Promise<ServiceMetaMock> {
    this.startIndex = ServiceMock.startSequence++;
    this.startCalls++;
    if (this.failOnStart === true) {
      return Promise.reject(new StartError('synthetic-start-error'));
    }
    return Promise.resolve(this.meta);
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
