import { SafeEnvGetter } from '../src';

test('getEnv', () => {
  process.env.TEST = 'test';
  expect(new SafeEnvGetter().getEnv('TEST')).toBe('test');
  delete process.env.TEST;
  expect(new SafeEnvGetter().getEnv('TEST')).toBeUndefined();
});