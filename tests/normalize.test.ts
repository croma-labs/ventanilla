import assert from "node:assert/strict";
import { test } from "node:test";
import { fold, keywords } from "../src/server/normalize.ts";

test("fold drops accents, case and punctuation", () => {
  assert.equal(fold("¿Cómo saco la CÉDULA?"), "como saco la cedula");
});

test("keywords ignore word order and filler words", () => {
  assert.equal(keywords("¿Cómo saco el pasaporte por primera vez?"), keywords("pasaporte primera vez, ¿cómo lo saco?"));
});

test("keywords keep the words that negate a question", () => {
  assert.notEqual(keywords("¿Puedo sacar el pasaporte sin cédula?"), keywords("¿Saco el pasaporte con la cédula?"));
  assert.notEqual(keywords("¿Puedo viajar si no tengo pasaporte?"), keywords("¿Puedo viajar si tengo pasaporte?"));
});
