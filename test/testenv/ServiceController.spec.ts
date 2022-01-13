import 'jest-extended';
import { v4 as uuid } from 'uuid';
import { ServiceController } from '../../lib/testenv/ServiceController';
import { EnvironmentContext, ServiceDescriptor, ServiceID } from '../../lib/testenv/types';
import { newServiceMock, ServiceMock, StartError, StopError } from './mocks';

describe('ServiceController', () => {
  
  describe('start', () => {
    test('should return service descriptor', async () => {
      const ctx = fakeContext();
      const [controller, service, expectedDescriptor] = newServiceController('s1');
  
      expect(service.startCalls).toEqual(0);
      await expect(controller.start(ctx)).resolves.toEqual(expectedDescriptor);
      expect(service.startCalls).toEqual(1);
    });
  
    test('should return descriptor immediately when already started', async () => {
      const ctx = fakeContext();
      const [controller, service, expectedDescriptor] = newServiceController('s1');
    
      await expect(controller.start(ctx)).resolves.toEqual(expectedDescriptor);
      await expect(controller.start(ctx)).resolves.toEqual(expectedDescriptor);
      
      expect(service.startCalls).toEqual(1);
    });
    
    test('should emit "started" event when started', async () => {
      const ctx = fakeContext();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [controller, _, expectedDescriptor] = newServiceController('s1');
      const startedPromise = new Promise((resolve) => {
        controller.on('started', resolve);
      });
      
      // noinspection ES6MissingAwait
      controller.start(ctx);
      
      await expect(startedPromise).resolves.toEqual(expectedDescriptor);
    });
    
    test('should reject and emit an "error" event when fails to start', async () => {
      const ctx = fakeContext();
      const [controller] = newServiceController('s1', true);
      const errorPromise = new Promise((resolve) => {
        controller.on('error', resolve);
      });
      
      await expect(controller.start(ctx)).toReject();
      await expect(errorPromise).resolves.toEqual(new StartError());
    });
  });
  
  describe('stop', () => {
    test('should stop the service', async () => {
      const ctx = fakeContext();
      const [controller, service] = newServiceController('s1');
      await controller.start(ctx);
   
      expect(service.stopCalls).toEqual(0);
      await expect(controller.stop(ctx)).toResolve();
      expect(service.stopCalls).toEqual(1);
    });
  
    test('should return immediately when already stopped', async () => {
      const ctx = fakeContext();
      const [controller, service] = newServiceController('s1');
      await controller.start(ctx);
  
      await expect(controller.stop(ctx)).toResolve();
      await expect(controller.stop(ctx)).toResolve();
      expect(service.stopCalls).toEqual(1);
    });
    
    test('should emit "stopped" event when stopped', async () => {
      const ctx = fakeContext();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [controller, _, expectedDescriptor] = newServiceController('s1');
      const stoppedPromise = new Promise((resolve) => {
        controller.on('started', resolve);
      });
      
      await controller.start(ctx);
      // noinspection ES6MissingAwait
      controller.stop(ctx);
      
      await expect(stoppedPromise).resolves.toEqual(expectedDescriptor);
    });
    
    test('should reject and emit an "error" event when fails to start', async () => {
      const ctx = fakeContext();
      const [controller] = newServiceController('s1', false, true);
      const errorPromise = new Promise((resolve) => {
        controller.on('error', resolve);
      });
      

      await controller.start(ctx);
      
      await expect(controller.stop(ctx)).rejects.toThrow(new StopError());
      await expect(errorPromise).resolves.toEqual(new StopError());
    });
  });
});

function fakeContext(): EnvironmentContext {
  return {
    name: `env-${uuid()}`,
    services: new Map<ServiceID, ServiceDescriptor>(),
  };
}

function newServiceController(serviceName: string, failOnStart?: boolean, failOnStop?:boolean): 
  [ServiceController, ServiceMock, ServiceDescriptor] {
  const [service, descriptor] = newServiceMock(serviceName, failOnStart, failOnStop);
  return [new ServiceController(service), service, descriptor];
}
