import assert from "node:assert/strict";
import { test } from "node:test";
import { buildIndex, loadIndex, processTerm, toDoc, type CorpusLine } from "../src/server/corpus-index.ts";

const line = (number: number, name: string, body: string): CorpusLine => ({
  path: `tramites/${number}.md`,
  number,
  name,
  entity: "Entidad de prueba",
  entity_code: null,
  entity_order: null,
  municipality_code: null,
  municipality: null,
  official_url: `https://www.gov.co/tramite/${number}`,
  modified_at: "2026-01-15T10:00:00Z",
  markdown: `---\nurl_entidad: https://www.entidad.gov.co/inicio\n---\n${body}`,
});

test("terms are folded, stemmed and filtered", () => {
  assert.equal(processTerm("Renovación"), "renova");
  assert.equal(processTerm("renovar"), "renova");
  assert.equal(processTerm("trámite"), null);
  assert.equal(processTerm("2026"), "2026");
});

test("a record keeps its entity, host and date, and drops the header", () => {
  const doc = toDoc(line(1, "Pasaporte ordinario", "Requisitos del pasaporte."));
  assert.equal(doc.host, "entidad.gov.co");
  assert.equal(doc.modified, "2026-01-15");
  assert.equal(doc.text, "Entidad: Entidad de prueba (sitio web: https://www.entidad.gov.co/inicio)\nInformación oficial actualizada el 2026-01-15\nRequisitos del pasaporte.");
});

test("the index finds a record by its name and survives a round trip", () => {
  const docs = [line(1, "Pasaporte ordinario", "Requisitos y costos."), line(2, "Duplicado de la cédula", "Se pide en línea.")].map(toDoc);
  const index = loadIndex(JSON.stringify(buildIndex(docs)));
  const [first] = index.search("¿Cómo saco el pasaporte?");
  assert.equal(first.id, 1);
  assert.ok(Object.values(first.match).some((fields) => fields.includes("name")));
});
