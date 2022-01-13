import {main} from './demo';
import 'jest-extended';

describe('Demo', () => {
  test('should complete with no errors', async () => {
    await expect(main()).toResolve();
  });
});