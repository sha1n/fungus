import 'jest-extended';
import { v4 as uuid } from 'uuid';
import { ServiceController } from '../lib/ServiceController';
import { RuntimeContext, ServiceMetadata } from '../lib/types';
import { aServiceMock, ServiceMock, StartError, StopError } from './mocks';

describe('ServiceController', () => {
  describe('start', () => {
    test('should return service metadata', async () => {
      const ctx = anRuntimeContext();
      const [controller, service, expectedMetadata] = aService();

      expect(service.startCalls).toEqual(0);
      await expect(controller.start(ctx)).resolves.toEqual(expectedMetadata);
      expect(service.startCalls).toEqual(1);
    });

    test('should return metadata immediately when already started', async () => {
      const ctx = anRuntimeContext();
      const [controller, service, expectedMetadata] = aService();

      await expect(controller.start(ctx)).resolves.toEqual(expectedMetadata);
      await expect(controller.start(ctx)).resolves.toEqual(expectedMetadata);

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
  });
});

function anRuntimeContext(): RuntimeContext {
  return new RuntimeContext(`env-${uuid()}`);
}

function aService(failOnStart?: boolean, failOnStop?: boolean): [ServiceController, ServiceMock, ServiceMetadata] {
  const [service, metadata] = aServiceMock(failOnStart, failOnStop);
  return [new ServiceController(service), service, metadata];
}
