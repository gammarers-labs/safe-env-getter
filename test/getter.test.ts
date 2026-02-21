import { SafeEnvGetter, SafeEnvType } from '../src';

describe('SafeEnvGetter.getEnv', () => {
  describe('string', () => {
    test('should return value when set', () => {
      process.env.TEST_STR = 'test';
      expect(SafeEnvGetter.getEnv('TEST_STR', SafeEnvType.String)).toBe('test');
      delete process.env.TEST_STR;
    });
    test('should return default when missing', () => {
      delete process.env.TEST_STR;
      expect(SafeEnvGetter.getEnv('TEST_STR', { ...SafeEnvType.String, default: 'fallback' })).toBe('fallback');
    });
    test('should throw when missing and no default', () => {
      delete process.env.TEST_STR;
      expect(() => SafeEnvGetter.getEnv('TEST_STR', SafeEnvType.String)).toThrow(
        'Missing required environment variable: TEST_STR',
      );
    });
  });

  describe('number', () => {
    test('should return parsed number when valid', () => {
      process.env.TEST_NUM = '42';
      expect(SafeEnvGetter.getEnv('TEST_NUM', SafeEnvType.Number)).toBe(42);
      delete process.env.TEST_NUM;
    });
    test('should return default when missing', () => {
      delete process.env.TEST_NUM;
      expect(SafeEnvGetter.getEnv('TEST_NUM', { ...SafeEnvType.Number, default: 100 })).toBe(100);
    });
    test('should throw when value is not a number', () => {
      process.env.TEST_NUM = 'not-a-number';
      expect(() => SafeEnvGetter.getEnv('TEST_NUM', SafeEnvType.Number)).toThrow(
        'Env TEST_NUM: expected number, got "not-a-number"',
      );
      delete process.env.TEST_NUM;
    });
    test('should throw when missing and no default', () => {
      delete process.env.TEST_NUM;
      expect(() => SafeEnvGetter.getEnv('TEST_NUM', SafeEnvType.Number)).toThrow(
        'Missing required environment variable: TEST_NUM',
      );
    });
  });

  describe('boolean', () => {
    test('should parse 1, true, yes, on (case insensitive) as true', () => {
      for (const val of ['1', 'true', 'TRUE', 'yes', 'on']) {
        process.env.TEST_BOOL = val;
        expect(SafeEnvGetter.getEnv('TEST_BOOL', SafeEnvType.Boolean)).toBe(true);
      }
      delete process.env.TEST_BOOL;
    });
    test('should parse other values as false', () => {
      process.env.TEST_BOOL = '0';
      expect(SafeEnvGetter.getEnv('TEST_BOOL', SafeEnvType.Boolean)).toBe(false);
      process.env.TEST_BOOL = 'false';
      expect(SafeEnvGetter.getEnv('TEST_BOOL', SafeEnvType.Boolean)).toBe(false);
      delete process.env.TEST_BOOL;
    });
    test('should return default when missing', () => {
      delete process.env.TEST_BOOL;
      expect(SafeEnvGetter.getEnv('TEST_BOOL', { ...SafeEnvType.Boolean, default: true })).toBe(true);
    });
    test('should throw when missing and no default', () => {
      delete process.env.TEST_BOOL;
      expect(() => SafeEnvGetter.getEnv('TEST_BOOL', SafeEnvType.Boolean)).toThrow(
        'Missing required environment variable: TEST_BOOL',
      );
    });
  });

  describe('enum', () => {
    const choices = ['a', 'b', 'c'] as const;
    test('should return value when in choices', () => {
      process.env.TEST_ENUM = 'b';
      expect(SafeEnvGetter.getEnv('TEST_ENUM', SafeEnvType.Enum(choices))).toBe('b');
      delete process.env.TEST_ENUM;
    });
    test('should return default when missing', () => {
      delete process.env.TEST_ENUM;
      expect(SafeEnvGetter.getEnv('TEST_ENUM', { ...SafeEnvType.Enum(choices), default: 'a' })).toBe('a');
    });
    test('should throw when value is not in choices', () => {
      process.env.TEST_ENUM = 'x';
      expect(() => SafeEnvGetter.getEnv('TEST_ENUM', SafeEnvType.Enum(choices))).toThrow(
        'Env TEST_ENUM: must be one of [a, b, c]',
      );
      delete process.env.TEST_ENUM;
    });
    test('should throw when missing and no default', () => {
      delete process.env.TEST_ENUM;
      expect(() => SafeEnvGetter.getEnv('TEST_ENUM', SafeEnvType.Enum(choices))).toThrow(
        'Missing required environment variable: TEST_ENUM',
      );
    });
  });
});