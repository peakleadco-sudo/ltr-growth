/**
 * Tiny builder + validator for the JSON Schema subset accepted by OpenAI
 * structured outputs (strict mode). Every object lists all properties as
 * required and forbids extra keys; optional values are expressed as nullable.
 * The same schema object is sent to the provider and used to validate the
 * response, so the two can never drift apart.
 */
export type Schema =
  | { type: "string"; description?: string; enum?: string[] }
  | { type: "integer" | "number"; description?: string }
  | { type: "boolean"; description?: string }
  | { type: "array"; items: Schema; description?: string }
  | { type: "object"; properties: Record<string, Schema>; required: string[]; additionalProperties: false; description?: string }
  | { anyOf: [Schema, { type: "null" }]; description?: string };

export const s = {
  str: (description?: string): Schema => ({ type: "string", ...(description ? { description } : {}) }),
  int: (description?: string): Schema => ({ type: "integer", ...(description ? { description } : {}) }),
  num: (description?: string): Schema => ({ type: "number", ...(description ? { description } : {}) }),
  bool: (description?: string): Schema => ({ type: "boolean", ...(description ? { description } : {}) }),
  enum: (values: readonly string[], description?: string): Schema => ({ type: "string", enum: [...values], ...(description ? { description } : {}) }),
  arr: (items: Schema, description?: string): Schema => ({ type: "array", items, ...(description ? { description } : {}) }),
  obj: (properties: Record<string, Schema>, description?: string): Schema => ({
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
    ...(description ? { description } : {}),
  }),
  nullable: (inner: Schema): Schema => ({ anyOf: [inner, { type: "null" }] }),
};

export type ValidationError = { path: string; message: string };

export function validate(schema: Schema, value: unknown, path = "$", errors: ValidationError[] = []): ValidationError[] {
  if (errors.length > 20) return errors;
  if ("anyOf" in schema) {
    if (value === null) return errors;
    return validate(schema.anyOf[0], value, path, errors);
  }
  switch (schema.type) {
    case "string":
      if (typeof value !== "string") errors.push({ path, message: "expected string" });
      else if (schema.enum && !schema.enum.includes(value)) errors.push({ path, message: `expected one of ${schema.enum.join(", ")}` });
      break;
    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) errors.push({ path, message: "expected integer" });
      break;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) errors.push({ path, message: "expected number" });
      break;
    case "boolean":
      if (typeof value !== "boolean") errors.push({ path, message: "expected boolean" });
      break;
    case "array":
      if (!Array.isArray(value)) errors.push({ path, message: "expected array" });
      else value.forEach((v, i) => validate(schema.items, v, `${path}[${i}]`, errors));
      break;
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        errors.push({ path, message: "expected object" });
        break;
      }
      const obj = value as Record<string, unknown>;
      for (const key of schema.required) {
        if (!(key in obj)) errors.push({ path: `${path}.${key}`, message: "missing" });
        else validate(schema.properties[key]!, obj[key], `${path}.${key}`, errors);
      }
      for (const key of Object.keys(obj)) {
        if (!(key in schema.properties)) errors.push({ path: `${path}.${key}`, message: "unexpected property" });
      }
      break;
    }
  }
  return errors;
}

/** Narrow an object schema to a single top-level property, used for section regeneration. */
export function sectionSchema(schema: Schema, key: string): Schema {
  if (!("type" in schema) || schema.type !== "object" || !schema.properties[key]) {
    throw new Error(`Unknown section: ${key}`);
  }
  return s.obj({ [key]: schema.properties[key] });
}

/** Asserts a schema follows strict structured-output rules (used in tests). */
export function strictModeProblems(schema: Schema, path = "$"): string[] {
  const out: string[] = [];
  if ("anyOf" in schema) return strictModeProblems(schema.anyOf[0], path);
  if (schema.type === "array") return strictModeProblems(schema.items, `${path}[]`);
  if (schema.type === "object") {
    const keys = Object.keys(schema.properties);
    if (schema.additionalProperties !== false) out.push(`${path}: additionalProperties must be false`);
    if (keys.length !== schema.required.length || keys.some((k) => !schema.required.includes(k))) out.push(`${path}: all properties must be required`);
    for (const k of keys) out.push(...strictModeProblems(schema.properties[k]!, `${path}.${k}`));
  }
  return out;
}
