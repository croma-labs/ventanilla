import assert from "node:assert/strict";
import { test } from "node:test";
import { detectors } from "../src/countries/co/pii.ts";
import { findSensitive, scrub } from "../src/lib/pii.ts";

const labels = (text: string) => findSensitive(text, detectors).map((span) => span.label);

test("scrub replaces what it finds and counts it", () => {
  assert.deepEqual(scrub("mi correo es persona@example.com, gracias", detectors), { text: "mi correo es [EMAIL], gracias", redacted: 1 });
});

test("document numbers are caught with and without a label", () => {
  assert.deepEqual(labels("mi cédula es 1.020.304.050"), ["DOCUMENTO"]);
  assert.deepEqual(labels("cc 1020304050"), ["DOCUMENTO"]);
  assert.deepEqual(labels("perdí la cédula, el número era 1020304050"), ["DOCUMENTO"]);
});

test("amounts of money are not document numbers", () => {
  assert.deepEqual(labels("¿el pasaporte cuesta $1.300.000?"), []);
  assert.deepEqual(labels("gano 2.500.000 pesos, ¿declaro renta?"), []);
});

test("phones, plates and addresses are caught", () => {
  assert.deepEqual(labels("llámame al 300 123 4567"), ["TELEFONO"]);
  assert.deepEqual(labels("comparendo de la placa ABC123"), ["PLACA"]);
  assert.deepEqual(labels("vivo en la calle 45 # 12-34"), ["DIRECCION"]);
});

test("card numbers need a valid checksum", () => {
  assert.deepEqual(labels("pagué con 4111 1111 1111 1111"), ["TARJETA"]);
  assert.deepEqual(labels("radicado 4111 1111 1111 1112"), []);
});

test("a plain question has nothing to scrub", () => {
  assert.equal(scrub("¿Cómo saco el pasaporte por primera vez?", detectors).redacted, 0);
});
