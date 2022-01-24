import 'jest-extended';
import { v4 as uuid } from 'uuid';
import { ServiceController } from '../lib/ServiceController';
import { RuntimeContext, ServiceDescriptor } from '../lib/types';
import { aServiceMock, ServiceMetaMock, ServiceMock, StartError, StopError } from './mocks';

describe('ServiceController', () => {
  describe('start', () => {
    test('should return service descriptor', async () => {
      const ctx = anRuntimeContext();
      const [controller, service, expectedDescriptor] = aServiceController('s1');

      expect(service.startCalls).toEqual(0);
      await expect(controller.start(ctx)).resolves.toEqual(expectedDescriptor.meta);
      expect(service.startCalls).toEqual(1);
    });

    test('should return descriptor immediately when already started', async () => {
      const ctx = anRuntimeContext();
      const [controller, service, expectedDescriptor] = aServiceController('s1');

      await expect(controller.start(ctx)).resolves.toEqual(expectedDescriptor.meta);
      await expect(controller.start(ctx)).resolves.toEqual(expectedDescriptor.meta);

      expect(service.startCalls).toEqual(1);
    });

    test('should emit "started" event when started', async () => {
      const ctx = anRuntimeContext();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [controller, _, expectedDescriptor] = aServiceController('s1');
      const startedPromise = new Promise(resolve => {
        controller.on('started', resolve);
      });

      // noinspection ES6MissingAwait
      controller.start(ctx);

      await expect(startedPromise).resolves.toEqual(expectedDescriptor);
    });

    test('should reject and emit an "error" event when fails to start', async () => {
      const ctx = anRuntimeContext();
      const [controller] = aServiceController('s1', true);
      const errorPromise = new Promise(resolve => {
        controller.on('error', resolve);
      });

      await expect(controller.start(ctx)).toReject();
      await expect(errorPromise).resolves.toEqual(new StartError());
    });
  });

  describe('stop', () => {
    test('should stop the service', async () => {
      const ctx = anRuntimeContext();
      const [controller, service] = aServiceController('s1');
      await controller.start(ctx);

      expect(service.stopCalls).toEqual(0);
      await expect(controller.stop(ctx)).toResolve();
      expect(service.stopCalls).toEqual(1);
    });

    test('should return immediately when already stopped', async () => {
      const ctx = anRuntimeContext();
      const [controller, service] = aServiceController('s1');
      await controller.start(ctx);

      await expect(controller.stop(ctx)).toResolve();
      await expect(controller.stop(ctx)).toResolve();
      expect(service.stopCalls).toEqual(1);
    });

    test('should emit "stopped" event when stopped', async () => {
      const ctx = anRuntimeContext();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [controller, _, expectedDescriptor] = aServiceController('s1');
      const stoppedPromise = new Promise(resolve => {
        controller.on('started', resolve);
      });

      await controller.start(ctx);
      // noinspection ES6MissingAwait
      controller.stop(ctx);

      await expect(stoppedPromise).resolves.toEqual(expectedDescriptor);
    });

    test('should reject and emit an "error" event when fails to start', async () => {
      const ctx = anRuntimeContext();
      const [controller] = aServiceController('s1', false, true);
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

function aServiceController(
  serviceName: string,
  failOnStart?: boolean,
  failOnStop?: boolean
): [ServiceController<ServiceMetaMock>, ServiceMock, ServiceDescriptor<ServiceMetaMock>] {
  const [service, descriptor] = aServiceMock(serviceName, failOnStart, failOnStop);
  return [new ServiceController(service), service, descriptor];
}
