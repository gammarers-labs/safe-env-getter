/**
 * Spec for a string environment variable.
 * The default value is passed via the third argument of `getEnv`, not in the spec.
 */
export type SafeEnvTypeString = { type: 'string'; default?: string };

/**
 * Spec for a numeric environment variable.
 * Values must be decimal integers (optional leading `-`); whitespace-only, hex,
 * `Infinity`, `NaN`, and non-integer forms throw.
 * The default value is passed via the third argument of `getEnv`, not in the spec.
 */
export type SafeEnvTypeNumber = { type: 'number'; default?: number };

/**
 * Pattern for strict decimal integer env values.
 * Allows an optional leading `-` followed by one or more digits.
 * Rejects hex (`0x…`), floats, exponents, `Infinity`, `NaN`, and signs other than leading `-`.
 */
const STRICT_INTEGER_PATTERN = /^-?\d+$/;

/**
 * Parses a string as a finite decimal integer for environment variables.
 *
 * Trims leading and trailing whitespace before validation. Whitespace-only input is invalid.
 *
 * @param raw - Raw environment variable value.
 * @returns Parsed integer, or `undefined` when the value is not a valid decimal integer.
 */
const parseStrictInteger = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (trimmed === '' || !STRICT_INTEGER_PATTERN.test(trimmed)) {
    return undefined;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return undefined;
  }
  return n;
};

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
 * Discriminated union of error kinds emitted during environment variable parsing.
 *
 * - `missing` — Variable unset or empty string without a default.
 * - `invalid_number` — Value is not a strict decimal integer (see `SafeEnvTypeNumber`).
 * - `invalid_enum` — Value is not one of the allowed enum choices.
 */
export type SafeEnvErrorKind = 'missing' | 'invalid_number' | 'invalid_enum';

/**
 * A structured validation error entry for a single environment variable.
 *
 * @template K - Environment variable key type.
 */
export type SafeEnvError<K extends string = string> = {
  /** Environment variable name. */
  key: K;
  /** Human-readable error message. */
  message: string;
  /** Raw value from `process.env`, if present. */
  raw?: string;
  /** Error category for programmatic handling. */
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
  /**
   * @param message - Error message.
   */
  protected constructor(message: string) {
    super(message);
    this.name = 'SafeEnvGetterError';
  }
}

/**
 * Validation error that carries one or more environment variable issues.
 *
 * Thrown by `SafeEnvGetter.getEnv()` (single-entry `errors`) and
 * `SafeEnvGetter.getEnvs()` (multi-entry `errors`).
 *
 * @template K - Union of environment variable keys included in `errors`.
 */
export class SafeEnvGetterValidationError<K extends string = string> extends SafeEnvGetterError {
  /**
   * Formats validation errors into a human-readable error message.
   *
   * @template K - Environment variable key type.
   * @param errors - Validation error entries to format.
   * @returns Multi-line summary listing each key and message.
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
   *
   * @param errors - One or more structured validation errors.
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
  /** Spec for a string value (returned as-is). */
  String: { type: 'string' } as const satisfies SafeEnvTypeString,
  /**
   * Spec for a strict decimal integer.
   * Rejects whitespace-only, hex, `Infinity`, `NaN`, and non-integer forms.
   */
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
 * Options for reading an environment variable with an optional default.
 *
 * @template S - Environment variable spec type.
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

/** Extracts the spec type from a schema entry or `[spec, options]` tuple. */
type SafeEnvSchemaEntryToSpec<E> = E extends readonly [infer S, unknown] ? S : E;

/**
 * Maps a schema object to the resulting parsed environment object type.
 *
 * @template TSchema - Schema object type passed to `getEnvs`.
 */
export type SafeEnvSchemaToType<TSchema extends SafeEnvSchema> = {
  [K in keyof TSchema]: SafeEnvSpecToType<SafeEnvSchemaEntryToSpec<TSchema[K]> & SafeEnvSpec>;
};

/**
 * Reads and parses an environment variable according to the given spec.
 *
 * Missing or empty (`""`) values use `options.default` when provided; otherwise an error is thrown.
 * For `SafeEnvType.Number`, values are parsed as strict decimal integers (see `SafeEnvTypeNumber`).
 *
 * @template K - Environment variable key type.
 * @template S - Environment variable spec type.
 * @param key - Environment variable name (e.g. `"PORT"`, `"NODE_ENV"`).
 * @param spec - Type spec; defaults to `SafeEnvType.String` when omitted.
 * @param options - Optional. Use `{ default: value }` to provide a fallback when the variable is missing or empty.
 * @returns Parsed value with type inferred from `spec`.
 * @throws {SafeEnvGetterValidationError} When the variable is missing, empty without a default, or invalid for the spec.
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
      const n = parseStrictInteger(raw);
      if (n === undefined) {
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
 * Always evaluates every key in `schema`. Collects all validation errors and throws once
 * with a `SafeEnvGetterValidationError` that contains every issue.
 * Number specs use the same strict decimal integer rules as `getEnv`.
 *
 * @template TSchema - Schema object type.
 * @param schema - Map of environment variable names to specs, optionally with per-key defaults via `[spec, { default }]`.
 * @returns Parsed environment object with types inferred from the schema.
 * @throws {SafeEnvGetterValidationError} When one or more variables are missing, empty without a default, or invalid.
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
      const n = parseStrictInteger(raw);
      if (n === undefined) {
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
 * Type-safe environment variable getter for Node.js `process.env`.
 *
 * @example
 * ```ts
 * const port = SafeEnvGetter.getEnv('PORT', SafeEnvType.Number);
 * const envs = SafeEnvGetter.getEnvs({
 *   PORT: SafeEnvType.Number,
 *   DEBUG: [SafeEnvType.Boolean, { default: false }],
 * });
 * ```
 */
export const SafeEnvGetter = {
  /** Reads and parses a single environment variable. See {@link getEnv}. */
  getEnv,
  /** Reads and parses multiple environment variables. See {@link getEnvs}. */
  getEnvs,
} as const;