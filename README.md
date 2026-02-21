# Safe Env Getter

[![npm version](https://img.shields.io/npm/v/safe-env-getter.svg)](https://www.npmjs.com/package/safe-env-getter)
[![npm downloads](https://img.shields.io/npm/dm/safe-env-getter.svg)](https://www.npmjs.com/package/safe-env-getter)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Type-safe environment variable getter for Node.js. Reads and parses `process.env` with a spec (string, number, boolean, enum), optional defaults, and clear errors when required variables are missing or invalid.

## Features

- **Typed specs**: `string`, `number`, `boolean`, and `enum` with TypeScript inference
- **Optional defaults**: Fallback values when the variable is unset or empty
- **Strict validation**: Throws with clear messages for missing or invalid values
- **Boolean parsing**: Accepts `1`, `true`, `yes`, `on` (case-insensitive) as `true`
- **Enum constraint**: Restricts values to a fixed set of choices

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
import { SafeEnvGetter, SafeEnvType } from 'safe-env-getter';

// String (spec omitted → defaults to SafeEnvType.String; throws if missing)
const nodeEnv = SafeEnvGetter.getEnv('NODE_ENV');

// String with default (3rd arg: options)
const logLevel = SafeEnvGetter.getEnv('LOG_LEVEL', SafeEnvType.String, { default: 'info' });

// Number with default
const port = SafeEnvGetter.getEnv('PORT', SafeEnvType.Number, { default: 3000 });

// Boolean (parses 1/true/yes/on as true)
const debug = SafeEnvGetter.getEnv('DEBUG', SafeEnvType.Boolean, { default: false });

// Enum (required)
const mode = SafeEnvGetter.getEnv('MODE', SafeEnvType.Enum(['read', 'write']));
// Enum with default
const modeWithDefault = SafeEnvGetter.getEnv('MODE', SafeEnvType.Enum(['read', 'write']), { default: 'read' });
```

## Options

`SafeEnvGetter.getEnv(key, spec?, options?)` takes:

| Argument | Required | Description |
|----------|----------|-------------|
| **key**  | Yes      | Environment variable name (e.g. `"PORT"`, `"NODE_ENV"`). |
| **spec** | No       | Type spec; defaults to `SafeEnvType.String` when omitted. Use `SafeEnvType.String`, `SafeEnvType.Number`, `SafeEnvType.Boolean`, or `SafeEnvType.Enum(choices)`. |
| **options** | No    | Optional object. Use `{ default: value }` to provide a fallback when the variable is missing or empty. |

**Spec types:**

| Spec | Shape | Description |
|------|--------|-------------|
| `string`  | `{ type: 'string' }` | Raw string value. |
| `number`  | `{ type: 'number' }` | Parsed with `Number()`; throws if NaN. |
| `boolean` | `{ type: 'boolean' }` | `1`/`true`/`yes`/`on` (case-insensitive) → `true`, else `false`. |
| `enum`    | `{ type: 'enum', choices: readonly T[] }` | Value must be in `choices`; throws otherwise. |

**Errors:**

- If the variable is missing or empty and `options.default` is not set: `Missing required environment variable: <key>`.
- For `number`, invalid values: `Env <key>: expected number, got "<raw>"`.
- For `enum`, invalid values: `Env <key>: must be one of [choice1, choice2, ...]`.

## Requirements

- **Node.js** >= 20.0.0

## License

This project is licensed under the Apache-2.0 License.
