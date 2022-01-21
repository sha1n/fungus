import { main } from '../examples';
import 'jest-extended';

describe('Demo', () => {
  test('should complete with no errors', async () => {
    await expect(main()).toResolve();
  });
});
