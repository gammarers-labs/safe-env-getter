/**
 * Spec for a string environment variable.
 * The default value is passed via the third argument of `getEnv`, not in the spec.
 */
export type SafeEnvTypeString = { type: 'string'; default?: string };

/**
 * Spec for a numeric environment variable.
 * Values are parsed with `Number()`; invalid values throw.
 * The default value is passed via the third argument of `getEnv`, not in the spec.
 */
export type SafeEnvTypeNumber = { type: 'number'; default?: number };

/**
 * Spec for a boolean environment variable.
 * Parses `1`, `true`, `yes`, `on` (case-insensitive) as `true`; anything else as `false`.
 * The default value is passed via the third argument of `getEnv`, not in the spec.
 */
export type SafeEnvTypeBoolean = { type: 'boolean'; default?: boolean };

/**
 * Spec for an enum environment variable with a fixed set of choices.
 * The value must be one of `choices`; otherwise an error is thrown.
 * The default value is passed via the third argument of `getEnv`, not in the spec.
 *
 * @template T - Literal string union of allowed values.
 */
export type SafeEnvTypeEnum<T extends string = string> = { type: 'enum'; choices: readonly T[]; default?: T };

/** Union of all environment variable spec types. */
export type SafeEnvSpec =
  | SafeEnvTypeString
  | SafeEnvTypeNumber
  | SafeEnvTypeBoolean
  | SafeEnvTypeEnum;

/**
 * Discriminated union error kinds emitted during env parsing/validation.
 */
export type SafeEnvErrorKind = 'missing' | 'invalid_number' | 'invalid_enum';

/**
 * A structured validation error entry for a single env var.
 *
 * @template K - Environment variable key type.
 */
export type SafeEnvError<K extends string = string> = {
  key: K;
  message: string;
  raw?: string;
  kind: SafeEnvErrorKind;
};

/**
 * Base error class for this package.
 *
 * @example
 * ```ts
 * try {
 *   SafeEnvGetter.getEnv('PORT', SafeEnvType.Number);
 * } catch (e) {
 *   if (e instanceof SafeEnvGetterError) {
 *     // Handle all safe-env-getter errors
 *   }
 * }
 * ```
 */
export abstract class SafeEnvGetterError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = 'SafeEnvGetterError';
  }
}

/**
 * Validation error that carries one or more environment variable issues.
 *
 * It is thrown by `SafeEnvGetter.getEnv()` (single-entry `errors`) and
 * `SafeEnvGetter.getEnvs()` (multi-entry `errors`).
 */
export class SafeEnvGetterValidationError<K extends string = string> extends SafeEnvGetterError {
  /**
   * Formats validation errors into a human-readable error message.
   */
  public static format<K extends string>(errors: readonly SafeEnvError<K>[]): string {
    const lines = errors.map((e) => `- ${e.key}: ${e.message}${e.raw == null ? '' : ` (raw="${e.raw}")`}`);
    return `Invalid environment variables (${errors.length}):\n${lines.join('\n')}`;
  }

  /**
   * Structured list of validation errors.
   */
  public readonly errors: readonly SafeEnvError<K>[];
  /**
   * Convenience list of keys included in `errors`.
   */
  public readonly keys: readonly K[];

  /**
   * Creates a new validation error from one or more `SafeEnvError` entries.
   */
  public constructor(errors: readonly SafeEnvError<K>[]) {
    const msg = SafeEnvGetterValidationError.format(errors);
    super(msg);
    this.name = 'SafeEnvGetterValidationError';
    this.errors = errors;
    this.keys = errors.map((e) => e.key);
  }
}

/**
 * Predefined spec constants for use as the second argument to `getEnv`.
 * Use the third argument `options: { default: value }` to provide a fallback when the variable is missing.
 */
export const SafeEnvType = {
  /** Spec for a string value. */
  String: { type: 'string' } as const satisfies SafeEnvTypeString,
  /** Spec for a numeric value. */
  Number: { type: 'number' } as const satisfies SafeEnvTypeNumber,
  /** Spec for a boolean value (1/true/yes/on → true). */
  Boolean: { type: 'boolean' } as const satisfies SafeEnvTypeBoolean,
  /**
   * Returns a spec that restricts the value to one of the given choices.
   * @param choices - Allowed string literals.
   * @returns Enum spec for use with `getEnv`.
   */
  Enum: <T extends string>(choices: readonly T[]) => ({ type: 'enum', choices }) as SafeEnvTypeEnum<T>,
} as const;

/**
 * Infers the return type from the given spec.
 * @template S - A `SafeEnvSpec` variant.
 */
export type SafeEnvSpecToType<S> =
  S extends SafeEnvTypeString ? string
    : S extends SafeEnvTypeNumber ? number
      : S extends SafeEnvTypeBoolean ? boolean
        : S extends SafeEnvTypeEnum<infer T> ? T
          : never;

/**
 * Options for reading an env var with an optional default.
 */
export type SafeGetEnvOptions<S extends SafeEnvSpec> = { default?: SafeEnvSpecToType<S> };

/**
 * Schema entry for a single env var.
 *
 * Either provide a spec directly, or a tuple of `[spec, options]` to attach a default.
 */
export type SafeEnvSchemaEntry<S extends SafeEnvSpec = SafeEnvSpec> = S | readonly [S, SafeGetEnvOptions<S>];

/**
 * Schema object used by `getEnvs()`.
 *
 * Keys are env var names, values are specs (optionally with defaults).
 */
export type SafeEnvSchema = Record<string, SafeEnvSchemaEntry>;

type SafeEnvSchemaEntryToSpec<E> = E extends readonly [infer S, unknown] ? S : E;

/**
 * Maps a schema object to the resulting parsed env object type.
 */
export type SafeEnvSchemaToType<TSchema extends SafeEnvSchema> = {
  [K in keyof TSchema]: SafeEnvSpecToType<SafeEnvSchemaEntryToSpec<TSchema[K]> & SafeEnvSpec>;
};

/**
 * Reads and parses an environment variable according to the given spec.
 * If the variable is missing or empty and no default is provided in `options`, throws an error.
 *
 * @param key - Environment variable name (e.g. `"PORT"`, `"NODE_ENV"`).
 * @param spec - Type spec; defaults to `SafeEnvType.String` when omitted.
 * @param options - Optional. Use `{ default: value }` to provide a fallback when the variable is missing.
 * @returns Parsed value with type inferred from `spec`.
 * @throws {SafeEnvGetterValidationError} When the variable is missing/invalid and `options.default` is not set (or not applicable).
 */
function getEnv<K extends string, S extends SafeEnvSpec = SafeEnvTypeString>(
  key: K,
  spec: S = SafeEnvType.String as S,
  options?: { default?: SafeEnvSpecToType<S> },
): SafeEnvSpecToType<S> {
  const raw = process.env[key];
  const defaultValue = options?.default;
  const hasDefault = defaultValue !== undefined;

  if (raw == null || raw === '') {
    if (!hasDefault) {
      throw new SafeEnvGetterValidationError([
        { key, message: `Missing required environment variable: ${key}`, raw, kind: 'missing' },
      ]);
    }
    return defaultValue as SafeEnvSpecToType<S>;
  }

  switch (spec.type) {
    case 'number': {
      const n = Number(raw);
      if (Number.isNaN(n)) {
        throw new SafeEnvGetterValidationError([
          { key, message: `Env ${key}: expected number, got "${raw}"`, raw, kind: 'invalid_number' },
        ]);
      }
      return n as SafeEnvSpecToType<S>;
    }
    case 'boolean':
      return (/^(1|true|yes|on)$/i.test(raw) ? true : false) as SafeEnvSpecToType<S>;
    case 'enum':
      if (!spec.choices.includes(raw)) {
        throw new SafeEnvGetterValidationError([
          { key, message: `Env ${key}: must be one of [${spec.choices.join(', ')}]`, raw, kind: 'invalid_enum' },
        ]);
      }
      return raw as SafeEnvSpecToType<S>;
    default:
      return raw as SafeEnvSpecToType<S>;
  }
}

/**
 * Reads and parses multiple environment variables according to the given schema.
 *
 * This function always evaluates every key in `schema`. If any missing/invalid values
 * are found, it throws once with a `SafeEnvGetterValidationError` that contains all issues.
 *
 * @param schema - Map of env var names to specs, optionally with per-key defaults via `[spec, { default }]`.
 * @returns An object of parsed envs with types inferred from the schema.
 * @throws {SafeEnvGetterValidationError} When one or more required env vars are missing or invalid.
 */
const getEnvs = <TSchema extends SafeEnvSchema>(schema: TSchema): SafeEnvSchemaToType<TSchema> => {
  const envs: Partial<SafeEnvSchemaToType<TSchema>> = {};
  const errors: SafeEnvError<Extract<keyof TSchema, string>>[] = [];

  for (const key of Object.keys(schema) as Array<Extract<keyof TSchema, string>>) {
    const entry = schema[key];
    const spec = (Array.isArray(entry) ? entry[0] : entry) as SafeEnvSpec;
    const options = (Array.isArray(entry) ? entry[1] : undefined) as SafeGetEnvOptions<SafeEnvSpec> | undefined;

    const raw = process.env[key];
    const defaultValue = options?.default;
    const hasDefault = defaultValue !== undefined;

    if (raw == null || raw === '') {
      if (!hasDefault) {
        errors.push({ key, message: `Missing required environment variable: ${key}`, raw, kind: 'missing' });
        continue;
      }
      envs[key] = defaultValue as SafeEnvSchemaToType<TSchema>[typeof key];
      continue;
    }

    if (spec.type === 'number') {
      const n = Number(raw);
      if (Number.isNaN(n)) {
        errors.push({ key, message: `Env ${key}: expected number, got "${raw}"`, raw, kind: 'invalid_number' });
        continue;
      }
      envs[key] = n as SafeEnvSchemaToType<TSchema>[typeof key];
      continue;
    }

    if (spec.type === 'boolean') {
      envs[key] = (/^(1|true|yes|on)$/i.test(raw) ? true : false) as SafeEnvSchemaToType<TSchema>[typeof key];
      continue;
    }

    if (spec.type === 'enum') {
      if (!spec.choices.includes(raw)) {
        errors.push({
          key,
          message: `Env ${key}: must be one of [${spec.choices.join(', ')}]`,
          raw,
          kind: 'invalid_enum',
        });
        continue;
      }
      envs[key] = raw as SafeEnvSchemaToType<TSchema>[typeof key];
      continue;
    }

    envs[key] = raw as SafeEnvSchemaToType<TSchema>[typeof key];
  }

  if (errors.length > 0) throw new SafeEnvGetterValidationError(errors);
  return envs as SafeEnvSchemaToType<TSchema>;
};

/**
 * Safe environment variable getter.
 * Use `SafeEnvGetter.getEnv(key, spec?, options?)` to read and parse environment variables with type safety.
 */
export const SafeEnvGetter = {
  getEnv,
  getEnvs,
} as const;