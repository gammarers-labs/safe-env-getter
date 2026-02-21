/** Spec for a string environment variable. */
export type SafeEnvTypeString = { type: 'string'; default?: string };

/** Spec for a numeric environment variable. */
export type SafeEnvTypeNumber = { type: 'number'; default?: number };

/** Spec for a boolean environment variable (parses 1/true/yes/on as true). */
export type SafeEnvTypeBoolean = { type: 'boolean'; default?: boolean };

/** Spec for an enum environment variable with a fixed set of choices. */
export type SafeEnvTypeEnum<T extends string = string> = { type: 'enum'; choices: readonly T[]; default?: T };

/** Union of all environment variable spec types. */
export type SafeEnvSpec =
  | SafeEnvTypeString
  | SafeEnvTypeNumber
  | SafeEnvTypeBoolean
  | SafeEnvTypeEnum;

/** Predefined spec constants (use with default: SafeEnvType.String, or { ...SafeEnvType.String, default: 'x' }). */
export const SafeEnvType = {
  String: { type: 'string' } as const satisfies SafeEnvTypeString,
  Number: { type: 'number' } as const satisfies SafeEnvTypeNumber,
  Boolean: { type: 'boolean' } as const satisfies SafeEnvTypeBoolean,
  Enum: <T extends string>(choices: readonly T[]) => ({ type: 'enum', choices }) as SafeEnvTypeEnum<T>,
} as const;

/** Infers the return type from the given spec (via generics). */
export type SafeEnvSpecToType<S> =
  S extends SafeEnvTypeString ? string
    : S extends SafeEnvTypeNumber ? number
      : S extends SafeEnvTypeBoolean ? boolean
        : S extends SafeEnvTypeEnum<infer T> ? T
          : never;

/**
 * Reads and parses an environment variable according to the given spec.
 * Throws if the variable is missing and no default is provided.
 *
 * @param key - Environment variable name (e.g. "PORT", "NODE_ENV").
 * @param spec - Spec defining type and optional default.
 * @returns Parsed value with type inferred from spec.
 */
function getEnv<K extends string, S extends SafeEnvSpec>(key: K, spec: S): SafeEnvSpecToType<S> {
  const raw = process.env[key];
  const hasDefault = 'default' in spec && spec.default !== undefined;

  if (raw == null || raw === '') {
    if (!hasDefault) throw new Error(`Missing required environment variable: ${key}`);
    return spec.default as SafeEnvSpecToType<S>;
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

/** Safe environment variable getter (use SafeEnvGetter.getEnv). */
export const SafeEnvGetter = {
  getEnv,
} as const;