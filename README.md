# Safe Env Getter

[![npm version](https://img.shields.io/npm/v/safe-env-getter.svg)](https://www.npmjs.com/package/safe-env-getter)
[![npm downloads](https://img.shields.io/npm/dm/safe-env-getter.svg)](https://www.npmjs.com/package/safe-env-getter)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Type-safe environment variable getter for Node.js. Reads and parses `process.env` with specs (`string`, `number`, `boolean`, `enum`), optional defaults, and structured validation errors when values are missing or invalid.

## Features

- **Typed specs**: `string`, `number`, `boolean`, and `enum` with TypeScript inference
- **Strict decimal integers**: `SafeEnvType.Number` rejects whitespace-only, hex (`0x10`), `Infinity`, `NaN`, floats, exponents, and other non-integer forms
- **Optional defaults**: Fallback when a variable is unset or empty (`""`)
- **Batch parsing**: `getEnvs()` evaluates every key and throws once with all validation errors
- **Structured errors**: `SafeEnvGetterValidationError` exposes `errors` (`key`, `message`, `raw`, `kind`) and `keys`
- **Boolean parsing**: `1`, `true`, `yes`, `on` (case-insensitive) → `true`; any other non-empty value → `false`
- **Enum constraint**: Values must match one of the allowed choices

## Installation

**npm**

```bash
npm install safe-env-getter
```

**yarn**

```bash
yarn add safe-env-getter
```

## Usage

```ts
import { SafeEnvGetter, SafeEnvGetterValidationError, SafeEnvType } from 'safe-env-getter';

// String (spec omitted → SafeEnvType.String; throws if missing)
const nodeEnv = SafeEnvGetter.getEnv('NODE_ENV');

// String with default (used when unset or empty)
const logLevel = SafeEnvGetter.getEnv('LOG_LEVEL', SafeEnvType.String, { default: 'info' });

// Strict decimal integer (e.g. port, worker count)
const port = SafeEnvGetter.getEnv('PORT', SafeEnvType.Number, { default: 3000 });
// Valid: "42", "-1", "  42  " (trimmed)
// Invalid: "   ", "Infinity", "0x10", "3.14", "+42", "1e5"

// Boolean (1/true/yes/on → true; other non-empty values → false)
const debug = SafeEnvGetter.getEnv('DEBUG', SafeEnvType.Boolean, { default: false });

// Enum (value must be in choices)
const mode = SafeEnvGetter.getEnv('MODE', SafeEnvType.Enum(['read', 'write'] as const));
const modeWithDefault = SafeEnvGetter.getEnv(
  'MODE',
  SafeEnvType.Enum(['read', 'write'] as const),
  { default: 'read' },
);

// Read multiple env vars at once (collects all errors, then throws once)
const envs = SafeEnvGetter.getEnvs({
  PORT: [SafeEnvType.Number, { default: 3000 }],
  DEBUG: [SafeEnvType.Boolean, { default: false }],
  MODE: SafeEnvType.Enum(['read', 'write'] as const),
});

// Handle structured validation errors
try {
  SafeEnvGetter.getEnvs({
    PORT: SafeEnvType.Number,
    MODE: SafeEnvType.Enum(['read', 'write'] as const),
  });
} catch (e) {
  if (e instanceof SafeEnvGetterValidationError) {
    // e.errors: [{ key, message, raw?, kind }, ...]
    // e.keys:  ['PORT', 'MODE', ...]
    // kind: 'missing' | 'invalid_number' | 'invalid_enum'
    console.error(e.errors);
  }
  throw e;
}
```

## Options

### `SafeEnvGetter.getEnv(key, spec?, options?)`

| Argument | Required | Description |
|----------|----------|-------------|
| **key** | Yes | Environment variable name (e.g. `"PORT"`, `"NODE_ENV"`). |
| **spec** | No | Type spec; defaults to `SafeEnvType.String`. Use `SafeEnvType.String`, `SafeEnvType.Number`, `SafeEnvType.Boolean`, or `SafeEnvType.Enum(choices)`. |
| **options** | No | `{ default: value }` — used when the variable is **unset** or **empty** (`""`). |

### `SafeEnvGetter.getEnvs(schema)`

`schema` is an object where each key is an env var name and each value is either:

- A spec (e.g. `SafeEnvType.Number`)
- A tuple `[spec, { default }]` (e.g. `[SafeEnvType.Number, { default: 3000 }]`)

Evaluates every entry in `schema`. If any value is missing, empty without a default, or invalid, throws a single `SafeEnvGetterValidationError` containing all issues.

### Spec types

| Spec | Constant | Description |
|------|----------|-------------|
| `string` | `SafeEnvType.String` | Raw string value (no parsing). |
| `number` | `SafeEnvType.Number` | Strict decimal integer (see below). |
| `boolean` | `SafeEnvType.Boolean` | `1` / `true` / `yes` / `on` (case-insensitive) → `true`; otherwise → `false`. |
| `enum` | `SafeEnvType.Enum(choices)` | Value must be in `choices`. |

#### `SafeEnvType.Number` (strict decimal integer)

- Trims leading/trailing whitespace before validation.
- Allows optional leading `-` and one or more digits (e.g. `42`, `-1`, `007`).
- **Accepted examples**: `"3000"`, `"  42  "`, `"-1"`
- **Rejected examples**: `"   "` (whitespace-only), `"Infinity"`, `"0x10"`, `"3.14"`, `"NaN"`, `"+42"`, `"1e5"`

Unset or empty (`""`) values use `options.default` when provided; otherwise `kind: 'missing'`.

### Validation errors

| `kind` | When |
|--------|------|
| `missing` | Variable unset or empty without a default. |
| `invalid_number` | Value is not a strict decimal integer. |
| `invalid_enum` | Value is not in `choices`. |

**Message formats:**

- Missing: `Missing required environment variable: <key>`
- Number: `Env <key>: expected number, got "<raw>"`
- Enum: `Env <key>: must be one of [choice1, choice2, ...]`

`SafeEnvGetterValidationError` fields:

- `errors`: `[{ key, message, raw?, kind }, ...]`
- `keys`: `['KEY1', 'KEY2', ...]`

## Requirements

- **Node.js** >= 20.0.0

## License

This project is licensed under the Apache-2.0 License.
