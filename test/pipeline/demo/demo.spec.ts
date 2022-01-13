import run from '.';

describe('demo', () => {
  test('pipeline should finish', async () => {
    
    await expect(run()).toResolve();
  });
});