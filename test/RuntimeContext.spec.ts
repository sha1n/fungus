import { v4 as uuid } from 'uuid';
import { RuntimeContext } from '../lib/types';
import { aServiceDescriptor } from './mocks';

describe('RuntimeContext', () => {
  test('register should add service descriptor mapping', () => {
    const ctx = new RuntimeContext(uuid());
    const descriptor = aServiceDescriptor(uuid());

    expect(ctx.services.get(descriptor.id)).toBeUndefined();

    ctx.register(descriptor);

    expect(ctx.services.get(descriptor.id)).toEqual(descriptor);
  });

  test('query should return a registered descriptor', () => {
    const ctx = new RuntimeContext(uuid());
    const descriptor = aServiceDescriptor(uuid());

    ctx.register(descriptor);

    expect(ctx.services.get(descriptor.id)).toEqual(descriptor);
  });

  test('query should return undefined when no matching service is registered', () => {
    const ctx = new RuntimeContext(uuid());

    expect(ctx.services.get(uuid())).toBeUndefined();
  });
});
