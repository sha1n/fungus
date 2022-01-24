import { v4 as uuid } from 'uuid';
import { RuntimeContext } from '../lib/types';
import { aServiceDescriptor, ServiceMetaMock } from './mocks';

describe('RuntimeContext', () => {
  test('register should add service descriptor mapping', () => {
    const ctx = new RuntimeContext(uuid());
    const descriptor = aServiceDescriptor(uuid());

    expect(ctx.query(descriptor.id)).toBeUndefined();

    ctx.register(descriptor);

    expect(ctx.query(descriptor.id)).toEqual(descriptor);
  });

  test('query should return a registered descriptor', () => {
    const ctx = new RuntimeContext(uuid());
    const descriptor = aServiceDescriptor(uuid());

    ctx.register(descriptor);

    expect(ctx.query<ServiceMetaMock>(descriptor.id)).toEqual(descriptor);
  });

  test('query should return undefined when no matching service is registered', () => {
    const ctx = new RuntimeContext(uuid());

    expect(ctx.query<ServiceMetaMock>(uuid())).toBeUndefined();
  });
});
