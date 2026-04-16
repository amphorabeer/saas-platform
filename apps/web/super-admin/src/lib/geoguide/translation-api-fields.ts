import {
  SUPPORTED_TRANSLATION_LANGUAGES,
  getFieldSuffix,
} from "@/lib/constants/languages";

type JsonRecord = Record<string, unknown>;

/** Museum: name, description, city, address, introAudioUrl per locale */
export function pickMuseumTranslationFields(body: JsonRecord): JsonRecord {
  const out: JsonRecord = {};
  for (const { code } of SUPPORTED_TRANSLATION_LANGUAGES) {
    const s = getFieldSuffix(code);
    const keys = [
      `name${s}`,
      `description${s}`,
      `city${s}`,
      `address${s}`,
      `introAudioUrl${s}`,
    ] as const;
    for (const key of keys) {
      if (body[key] !== undefined) out[key] = body[key];
    }
  }
  return out;
}

/** Tour: name + description per locale */
export function pickTourTranslationFields(body: JsonRecord): JsonRecord {
  const out: JsonRecord = {};
  for (const { code } of SUPPORTED_TRANSLATION_LANGUAGES) {
    const s = getFieldSuffix(code);
    for (const key of [`name${s}`, `description${s}`] as const) {
      if (body[key] !== undefined) out[key] = body[key];
    }
  }
  return out;
}

/** Hall: name + description per locale */
export function pickHallTranslationFields(body: JsonRecord): JsonRecord {
  const out: JsonRecord = {};
  for (const { code } of SUPPORTED_TRANSLATION_LANGUAGES) {
    const s = getFieldSuffix(code);
    for (const key of [`name${s}`, `description${s}`] as const) {
      if (body[key] !== undefined) out[key] = body[key];
    }
  }
  return out;
}

/** TourStop: title, description, transcript, audioUrl per locale */
export function pickTourStopTranslationFields(body: JsonRecord): JsonRecord {
  const out: JsonRecord = {};
  for (const { code } of SUPPORTED_TRANSLATION_LANGUAGES) {
    const s = getFieldSuffix(code);
    for (const key of [
      `title${s}`,
      `description${s}`,
      `transcript${s}`,
      `audioUrl${s}`,
    ] as const) {
      if (body[key] !== undefined) out[key] = body[key];
    }
  }
  return out;
}

export function museumTranslationFieldsForCreate(body: JsonRecord): JsonRecord {
  const out: JsonRecord = {};
  for (const { code } of SUPPORTED_TRANSLATION_LANGUAGES) {
    const s = getFieldSuffix(code);
    out[`name${s}`] = body[`name${s}`] ?? null;
    out[`description${s}`] = body[`description${s}`] ?? null;
    out[`city${s}`] = body[`city${s}`] ?? null;
    out[`address${s}`] = body[`address${s}`] ?? null;
    out[`introAudioUrl${s}`] = body[`introAudioUrl${s}`] ?? null;
  }
  return out;
}

export function tourTranslationFieldsForCreate(body: JsonRecord): JsonRecord {
  const out: JsonRecord = {};
  for (const { code } of SUPPORTED_TRANSLATION_LANGUAGES) {
    const s = getFieldSuffix(code);
    out[`name${s}`] = body[`name${s}`] ?? null;
    out[`description${s}`] = body[`description${s}`] ?? null;
  }
  return out;
}

export function hallTranslationFieldsForCreate(body: JsonRecord): JsonRecord {
  const out: JsonRecord = {};
  for (const { code } of SUPPORTED_TRANSLATION_LANGUAGES) {
    const s = getFieldSuffix(code);
    out[`name${s}`] = body[`name${s}`] ?? null;
    out[`description${s}`] = body[`description${s}`] ?? null;
  }
  return out;
}

export function tourStopTranslationFieldsForCreate(body: JsonRecord): JsonRecord {
  const out: JsonRecord = {};
  for (const { code } of SUPPORTED_TRANSLATION_LANGUAGES) {
    const s = getFieldSuffix(code);
    out[`title${s}`] = body[`title${s}`] ?? null;
    out[`description${s}`] = body[`description${s}`] ?? null;
    out[`transcript${s}`] = body[`transcript${s}`] ?? null;
    out[`audioUrl${s}`] = body[`audioUrl${s}`] ?? null;
  }
  return out;
}
