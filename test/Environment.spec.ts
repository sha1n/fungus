import 'jest-extended';
import {Environment} from '../lib/Environment';
import {newServiceMock} from './mocks';

describe('Environment', () => {
  
  test('should fail if a cyclic service dependency is added', () => {
    const env = new Environment();
    const [service1] = newServiceMock('s1');
    const [service2] = newServiceMock('s2');

    env.register(service1, service2);
    expect(() => env.register(service2, service1)).toThrowError();
  });

  describe('start', () => {
    test('should start all registered services in the right order', async () => {
      const env = new Environment();
      const [service1, descriptor1] = newServiceMock('s1');
      const [service2, descriptor2] = newServiceMock('s2');
      const [service3, descriptor3] = newServiceMock('s3');
      const [service4, descriptor4] = newServiceMock('s4');
      const [service5, descriptor5] = newServiceMock('s5');
      
      env.register(service2, service1, service3, service4);
      env.register(service4, service3);
      env.register(service5);
      
      const ctx = await env.start();
      
      expect(ctx.name).toEqual(env.id);
      expect(Array.from(ctx.services.values()))
        .toIncludeSameMembers([descriptor1, descriptor2, descriptor3, descriptor4, descriptor5]);
        
      expect(service1.startIndex).toBeLessThan(service2.startIndex);
      expect(service3.startIndex).toBeLessThan(service2.startIndex);
      expect(service4.startIndex).toBeLessThan(service2.startIndex);
      expect(service3.startIndex).toBeLessThan(service4.startIndex);
      expect(service5.startCalls).toEqual(1);
    });

    test('should stop startup when a service fails and stop any started service', async () => {
      const env = new Environment();
      const [service1] = newServiceMock('s1');
      const [service2] = newServiceMock('s2');
      const [service3] = newServiceMock('s3', true);
      const [service4] = newServiceMock('s4');
      const [service5] = newServiceMock('s5');
      
      env.register(service1, service2);
      env.register(service2, service3);
      env.register(service3, service4);
      env.register(service4, service5);
      
      await expect(env.start()).toReject();
        
      expect(service1.startCalls).toEqual(0);
      expect(service2.startCalls).toEqual(0);
      expect(service3.startCalls).toEqual(1);
      expect(service4.startCalls).toEqual(1);
      expect(service5.startCalls).toEqual(1);
      
      expect(service1.stopCalls).toEqual(0);
      expect(service2.stopCalls).toEqual(0);
      expect(service3.stopCalls).toEqual(1);
      expect(service4.stopCalls).toEqual(1);
      expect(service5.stopCalls).toEqual(1);
    });
  });
  
  describe('stop', () => {
    test('should stop all registered services in reverse order', async () => {
      const env = new Environment();
      const [service1] = newServiceMock('s1');
      const [service2] = newServiceMock('s2');
      const [service3] = newServiceMock('s3');
      const [service4] = newServiceMock('s4');
      
      env.register(service2, service1, service3, service4);
      env.register(service4, service3);
      
      await env.start();
      await env.stop();
      
      expect(service2.stopIndex).toBeLessThan(service1.stopIndex);
      expect(service2.stopIndex).toBeLessThan(service3.stopIndex);
      expect(service2.stopIndex).toBeLessThan(service4.stopIndex);
      expect(service4.stopIndex).toBeLessThan(service3.stopIndex);

      expect(service1.stopCalls).toEqual(1);
      expect(service2.stopCalls).toEqual(1);
      expect(service3.stopCalls).toEqual(1);
      expect(service4.stopCalls).toEqual(1);
    });

    test('should continue to stop all registered services even when one fails', async () => {
      const env = new Environment();
      const [service1] = newServiceMock('s1');
      const [service2] = newServiceMock('s2', false, true);
      const [service3] = newServiceMock('s3');
      const [service4] = newServiceMock('s4');
      
      env.register(service4, service3);
      env.register(service3, service2);
      env.register(service2, service1);
      
      await env.start();
      await expect(env.stop()).toResolve();

      expect(service1.stopCalls).toEqual(1);
      expect(service2.stopCalls).toEqual(1);
      expect(service3.stopCalls).toEqual(1);
      expect(service4.stopCalls).toEqual(1);
    });
  });
});


