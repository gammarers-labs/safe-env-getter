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
 * Reads and parses an environment variable according to the given spec.
 * If the variable is missing or empty and no default is provided in `options`, throws an error.
 *
 * @param key - Environment variable name (e.g. `"PORT"`, `"NODE_ENV"`).
 * @param spec - Type spec; defaults to `SafeEnvType.String` when omitted.
 * @param options - Optional. Use `{ default: value }` to provide a fallback when the variable is missing.
 * @returns Parsed value with type inferred from `spec`.
 * @throws {Error} When the variable is missing and `options.default` is not set.
 * @throws {Error} When `spec.type` is `"number"` and the value is not a valid number.
 * @throws {Error} When `spec.type` is `"enum"` and the value is not in `spec.choices`.
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
    if (!hasDefault) throw new Error(`Missing required environment variable: ${key}`);
    return defaultValue as SafeEnvSpecToType<S>;
  }

  switch (spec.type) {
    case 'number': {
      const n = Number(raw);
      if (Number.isNaN(n)) throw new Error(`Env ${key}: expected number, got "${raw}"`);
      return n as SafeEnvSpecToType<S>;
    }
    case 'boolean':
      return (/^(1|true|yes|on)$/i.test(raw) ? true : false) as SafeEnvSpecToType<S>;
    case 'enum':
      if (!spec.choices.includes(raw)) throw new Error(`Env ${key}: must be one of [${spec.choices.join(', ')}]`);
      return raw as SafeEnvSpecToType<S>;
    default:
      return raw as SafeEnvSpecToType<S>;
  }
}

/**
 * Safe environment variable getter.
 * Use `SafeEnvGetter.getEnv(key, spec?, options?)` to read and parse environment variables with type safety.
 */
export const SafeEnvGetter = {
  getEnv,
} as const;