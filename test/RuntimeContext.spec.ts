import { v4 as uuid } from 'uuid';
import { RuntimeContext } from '../lib/types';
import { aServiceMetadata } from './mocks';

describe('RuntimeContext', () => {
  test('register should add service metadata mapping', () => {
    const ctx = new RuntimeContext(uuid());
    const metadata = aServiceMetadata();

    expect(ctx.services.get(metadata.id)).toBeUndefined();

    ctx.register(metadata);

    expect(ctx.services.get(metadata.id)).toEqual(metadata);
  });

  test('query should return a registered metadata', () => {
    const ctx = new RuntimeContext(uuid());
    const metadata = aServiceMetadata();

    ctx.register(metadata);

    expect(ctx.services.get(metadata.id)).toEqual(metadata);
  });

  test('query should return undefined when no matching service is registered', () => {
    const ctx = new RuntimeContext(uuid());

    expect(ctx.services.get(uuid())).toBeUndefined();
  });
});
