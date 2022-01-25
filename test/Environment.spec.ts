import 'jest-extended';
import { createEnvironment } from '../lib/Environment';
import { aServiceMock } from './mocks';

describe('Environment', () => {
  test('should fail if a cyclic service dependency is added', () => {
    const [service1] = aServiceMock();
    const [service2] = aServiceMock();

    const env = createEnvironment({
      1: { service: service1, dependencies: [service2] }
    });

    expect(() => env.register(service2, [service1])).toThrowError();
  });

  describe('start', () => {
    test('should start all registered services in the right order', async () => {
      const [service1, metadata1] = aServiceMock();
      const [service2, metadata2] = aServiceMock();
      const [service3, metadata3] = aServiceMock();
      const [service4, metadata4] = aServiceMock();
      const [service5, metadata5] = aServiceMock();

      const env = createEnvironment({
        2: { service: service2, dependencies: [service1, service3, service4] },
        4: { service: service4, dependencies: [service3] },
        5: { service: service5 }
      });

      const ctx = await env.start();

      expect(ctx.name).toEqual(env.id);
      expect(Array.from(ctx.services.values())).toIncludeSameMembers([
        metadata1,
        metadata2,
        metadata3,
        metadata4,
        metadata5
      ]);

      expect(service1.startIndex).toBeLessThan(service2.startIndex);
      expect(service3.startIndex).toBeLessThan(service2.startIndex);
      expect(service4.startIndex).toBeLessThan(service2.startIndex);
      expect(service3.startIndex).toBeLessThan(service4.startIndex);
      expect(service5.startCalls).toEqual(1);
    });

    test('should stop startup when a service fails and stop any started service', async () => {
      const [service1] = aServiceMock();
      const [service2] = aServiceMock();
      const [service3] = aServiceMock(true);
      const [service4] = aServiceMock();
      const [service5] = aServiceMock();

      const env = createEnvironment({
        1: { service: service1, dependencies: [service2] },
        2: { service: service2, dependencies: [service3] },
        3: { service: service3, dependencies: [service4] },
        4: { service: service4, dependencies: [service5] }
      });

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
      const [service1] = aServiceMock();
      const [service2] = aServiceMock();
      const [service3] = aServiceMock();
      const [service4] = aServiceMock();

      const env = createEnvironment({
        2: { service: service2, dependencies: [service1, service3, service4] },
        4: { service: service4, dependencies: [service3] }
      });

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
      const [service1] = aServiceMock();
      const [service2] = aServiceMock(false, true);
      const [service3] = aServiceMock();
      const [service4] = aServiceMock();

      const env = createEnvironment({
        4: { service: service4, dependencies: [service3] },
        3: { service: service3, dependencies: [service2] },
        2: { service: service2, dependencies: [service1] }
      });

      await env.start();
      await expect(env.stop()).toResolve();

      expect(service1.stopCalls).toEqual(1);
      expect(service2.stopCalls).toEqual(1);
      expect(service3.stopCalls).toEqual(1);
      expect(service4.stopCalls).toEqual(1);
    });
  });
});
