import { sleep, TimeUnit } from '@sha1n/about-time';
import 'jest-extended';
import { v4 as uuid } from 'uuid';
import { InternalRuntimeContext } from '../lib/Environment';
import { ServiceController } from '../lib/ServiceController';
import { Service, ServiceMetadata } from '../lib/types';
import { aServiceMock, ServiceMock, StartError, StopError } from './mocks';

describe('ServiceController', () => {
  describe('start', () => {
    test('should resolve and start the service', async () => {
      const ctx = anRuntimeContext();
      const [controller, service] = aService();

      expect(service.startCalls).toEqual(0);
      await expect(controller.start(ctx)).toResolve();
      expect(service.startCalls).toEqual(1);
    });

    test('should return metadata immediately when already started', async () => {
      const ctx = anRuntimeContext();
      const [controller, service] = aService();

      await expect(controller.start(ctx)).toResolve();
      await expect(controller.start(ctx)).toResolve();

      expect(service.startCalls).toEqual(1);
    });

    test('should emit "started" event when started', async () => {
      const ctx = anRuntimeContext();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [controller, _, expectedMetadata] = aService();
      const startedPromise = new Promise(resolve => {
        controller.on('started', resolve);
      });

      // noinspection ES6MissingAwait
      controller.start(ctx);

      await expect(startedPromise).resolves.toEqual(expectedMetadata);
    });

    test('should reject and emit an "error" event when fails to start', async () => {
      const ctx = anRuntimeContext();
      const [controller] = aService(true);
      const errorPromise = new Promise(resolve => {
        controller.on('error', resolve);
      });

      await expect(controller.start(ctx)).rejects.toThrow(new StartError());
      await expect(errorPromise).resolves.toEqual(new StartError());
    });
  });

  describe('stop', () => {
    test('should stop the service', async () => {
      const ctx = anRuntimeContext();
      const [controller, service] = aService();
      await controller.start(ctx);

      expect(service.stopCalls).toEqual(0);
      await expect(controller.stop(ctx)).toResolve();
      expect(service.stopCalls).toEqual(1);
    });

    test('should return immediately when already stopped', async () => {
      const ctx = anRuntimeContext();
      const [controller, service] = aService();
      await controller.start(ctx);

      await expect(controller.stop(ctx)).toResolve();
      await expect(controller.stop(ctx)).toResolve();
      expect(service.stopCalls).toEqual(1);
    });

    test('should emit "stopped" event when stopped', async () => {
      const ctx = anRuntimeContext();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [controller, _, expectedMetadata] = aService();
      const stoppedPromise = new Promise(resolve => {
        controller.on('started', resolve);
      });

      await controller.start(ctx);
      // noinspection ES6MissingAwait
      controller.stop(ctx);

      await expect(stoppedPromise).resolves.toEqual(expectedMetadata);
    });

    test('should reject and emit an "error" event when fails to start', async () => {
      const ctx = anRuntimeContext();
      const [controller] = aService(false, true);
      const errorPromise = new Promise(resolve => {
        controller.on('error', resolve);
      });

      await controller.start(ctx);

      await expect(controller.stop(ctx)).rejects.toThrow(new StopError());
      await expect(errorPromise).resolves.toEqual(new StopError());
    });

    test('should wait for startup to finish', async () => {
      const ctx = anRuntimeContext();
      const service = aSlowStartingService(0.5, TimeUnit.Second);
      const controller = new ServiceController(service);

      controller.start(ctx);

      await expect(controller.stop(ctx)).toResolve();
      expect(service.finishedStartup).toBeTrue();
    });
  });

  describe('addDependency', () => {
    test('should register a listener on dependency started events and start the service if no pending deps are left', async () => {
      const [controller, service] = aService();
      const [dependency] = aService();
      const ctx = anRuntimeContext();

      controller.addDependency(dependency);
      expect(service.startCalls).toEqual(0);

      await dependency.start(ctx);

      expect(service.startCalls).toEqual(1);
    });

    test('should not start the service when the context is shutting down', async () => {
      const [controller, service] = aService();
      const [dependency] = aService();
      const ctx = anRuntimeContext();
      ctx.shuttingDown = true;

      controller.addDependency(dependency);
      await dependency.start(ctx);

      expect(service.startCalls).toEqual(0);
    });
  });
});

function anRuntimeContext(): InternalRuntimeContext {
  return new InternalRuntimeContext(`env-${uuid()}`);
}

function aService(failOnStart?: boolean, failOnStop?: boolean): [ServiceController, ServiceMock, ServiceMetadata] {
  const [service, metadata] = aServiceMock(failOnStart, failOnStop);
  return [new ServiceController(service), service, metadata];
}

function aSlowStartingService(time: number, units: TimeUnit): Service & { finishedStartup: boolean } {
  const id = uuid();
  const finishedStartup = false;

  const service = {
    start: async () => {
      await sleep(time, units);
      service.finishedStartup = true;
      return {
        id
      };
    },
    stop: () => {
      return Promise.resolve();
    },
    id,
    finishedStartup
  };

  return service;
}
