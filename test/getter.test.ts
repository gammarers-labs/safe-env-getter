import { SafeEnvGetter, SafeEnvGetterValidationError, SafeEnvType } from '../src';

describe('SafeEnvGetter.getEnv', () => {
  describe('string', () => {
    test('should default to String type when spec omitted', () => {
      process.env.TEST_STR = 'hello';
      expect(SafeEnvGetter.getEnv('TEST_STR')).toBe('hello');
      delete process.env.TEST_STR;
    });
    test('should return value when set', () => {
      process.env.TEST_STR = 'test';
      expect(SafeEnvGetter.getEnv('TEST_STR', SafeEnvType.String)).toBe('test');
      delete process.env.TEST_STR;
    });
    test('should return default when missing', () => {
      delete process.env.TEST_STR;
      expect(SafeEnvGetter.getEnv('TEST_STR', SafeEnvType.String, { default: 'fallback' })).toBe('fallback');
    });
    test('should throw when missing and no default', () => {
      delete process.env.TEST_STR;
      expect(() => SafeEnvGetter.getEnv('TEST_STR', SafeEnvType.String)).toThrow(SafeEnvGetterValidationError);
      expect(() => SafeEnvGetter.getEnv('TEST_STR', SafeEnvType.String)).toThrow(
        'Missing required environment variable: TEST_STR',
      );
      try {
        SafeEnvGetter.getEnv('TEST_STR', SafeEnvType.String);
        throw new Error('Expected getEnv to throw');
      } catch (e) {
        expect(e).toBeInstanceOf(SafeEnvGetterValidationError);
        const ve = e as SafeEnvGetterValidationError<'TEST_STR'>;
        expect(ve.errors).toHaveLength(1);
        expect(ve.errors[0]).toEqual({
          key: 'TEST_STR',
          message: 'Missing required environment variable: TEST_STR',
          raw: undefined,
          kind: 'missing',
        });
        expect(ve.keys).toEqual(['TEST_STR']);
      }
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
      expect(SafeEnvGetter.getEnv('TEST_NUM', SafeEnvType.Number, { default: 100 })).toBe(100);
    });
    test('should throw when value is not a number', () => {
      process.env.TEST_NUM = 'not-a-number';
      expect(() => SafeEnvGetter.getEnv('TEST_NUM', SafeEnvType.Number)).toThrow(SafeEnvGetterValidationError);
      expect(() => SafeEnvGetter.getEnv('TEST_NUM', SafeEnvType.Number)).toThrow(
        'Env TEST_NUM: expected number, got "not-a-number"',
      );
      try {
        SafeEnvGetter.getEnv('TEST_NUM', SafeEnvType.Number);
        throw new Error('Expected getEnv to throw');
      } catch (e) {
        expect(e).toBeInstanceOf(SafeEnvGetterValidationError);
        const ve = e as SafeEnvGetterValidationError<'TEST_NUM'>;
        expect(ve.errors).toHaveLength(1);
        expect(ve.errors[0]).toEqual({
          key: 'TEST_NUM',
          message: 'Env TEST_NUM: expected number, got "not-a-number"',
          raw: 'not-a-number',
          kind: 'invalid_number',
        });
        expect(ve.keys).toEqual(['TEST_NUM']);
      }
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
      expect(SafeEnvGetter.getEnv('TEST_BOOL', SafeEnvType.Boolean, { default: true })).toBe(true);
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
      expect(SafeEnvGetter.getEnv('TEST_ENUM', SafeEnvType.Enum(choices), { default: 'a' })).toBe('a');
    });
    test('should throw when value is not in choices', () => {
      process.env.TEST_ENUM = 'x';
      expect(() => SafeEnvGetter.getEnv('TEST_ENUM', SafeEnvType.Enum(choices))).toThrow(SafeEnvGetterValidationError);
      expect(() => SafeEnvGetter.getEnv('TEST_ENUM', SafeEnvType.Enum(choices))).toThrow(
        'Env TEST_ENUM: must be one of [a, b, c]',
      );
      try {
        SafeEnvGetter.getEnv('TEST_ENUM', SafeEnvType.Enum(choices));
        throw new Error('Expected getEnv to throw');
      } catch (e) {
        expect(e).toBeInstanceOf(SafeEnvGetterValidationError);
        const ve = e as SafeEnvGetterValidationError<'TEST_ENUM'>;
        expect(ve.errors).toHaveLength(1);
        expect(ve.errors[0]).toEqual({
          key: 'TEST_ENUM',
          message: 'Env TEST_ENUM: must be one of [a, b, c]',
          raw: 'x',
          kind: 'invalid_enum',
        });
        expect(ve.keys).toEqual(['TEST_ENUM']);
      }
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

describe('SafeEnvGetter.getEnvs', () => {
  test('should return parsed values with defaults', () => {
    process.env.TEST_PORT = '1234';
    delete process.env.TEST_MODE;

    const envs = SafeEnvGetter.getEnvs({
      TEST_PORT: SafeEnvType.Number,
      TEST_DEBUG: [SafeEnvType.Boolean, { default: false }],
      TEST_MODE: [SafeEnvType.Enum(['read', 'write'] as const), { default: 'read' }],
    });

    expect(envs).toEqual({
      TEST_PORT: 1234,
      TEST_DEBUG: false,
      TEST_MODE: 'read',
    });

    delete process.env.TEST_PORT;
    delete process.env.TEST_DEBUG;
    delete process.env.TEST_MODE;
  });

  test('should collect multiple errors and throw once', () => {
    delete process.env.TEST_PORT;
    process.env.TEST_MODE = 'bad';

    try {
      SafeEnvGetter.getEnvs({
        TEST_PORT: SafeEnvType.Number,
        TEST_MODE: SafeEnvType.Enum(['read', 'write'] as const),
      });
      throw new Error('Expected getEnvs to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(SafeEnvGetterValidationError);
      const ve = e as SafeEnvGetterValidationError<'TEST_PORT' | 'TEST_MODE'>;
      expect(ve.errors).toHaveLength(2);
      expect(ve.keys).toEqual(['TEST_PORT', 'TEST_MODE']);
      expect(ve.errors).toEqual([
        {
          key: 'TEST_PORT',
          message: 'Missing required environment variable: TEST_PORT',
          raw: undefined,
          kind: 'missing',
        },
        {
          key: 'TEST_MODE',
          message: 'Env TEST_MODE: must be one of [read, write]',
          raw: 'bad',
          kind: 'invalid_enum',
        },
      ]);
    }

    delete process.env.TEST_MODE;
  });
});