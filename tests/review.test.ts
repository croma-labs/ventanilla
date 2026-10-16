import assert from "node:assert/strict";
import { test } from "node:test";
import { checkClaims, supporters } from "../src/server/review.ts";

const evidence = "Para la pensión de vejez se requieren 1.300 semanas cotizadas. La edad es de 57 años para mujeres y 62 para hombres.";

const status = (terms: string[], text = evidence) => checkClaims(text, [{ claim: "claim", terms }])[0].status;

test("a claim is found when its terms appear together, ignoring case and accents", () => {
  assert.equal(status(["1[.,]?300", "SEMANAS"]), "found");
  assert.equal(status(["pension", "vejez"]), "found");
});

test("a missing term is reported", () => {
  const [check] = checkClaims(evidence, [{ claim: "claim", terms: ["1[.,]?300", "meses"] }]);
  assert.equal(check.status, "not_found");
  assert.deepEqual(check.missing, ["meses"]);
});

test("terms that are far apart are scattered, not found", () => {
  assert.equal(status(["semanas", "hombres"], `1.300 semanas ${"x ".repeat(600)} 62 hombres`), "scattered");
});

test("patterns that could backtrack badly are refused", () => {
  assert.equal(status(["(a+)+"]), "invalid_pattern");
  assert.equal(status(["(?=semanas)"]), "invalid_pattern");
  assert.equal(status(["x".repeat(81)]), "invalid_pattern");
  assert.equal(status([]), "invalid_pattern");
});

test("at most twelve claims are checked", () => {
  assert.equal(checkClaims(evidence, Array.from({ length: 20 }, () => ({ claim: "claim", terms: ["semanas"] }))).length, 12);
});

test("supporters are the sources that back a found claim", () => {
  const candidates = [
    { url: "https://a.gov.co", text: "Se requieren 1.300 semanas cotizadas." },
    { url: "https://b.gov.co", text: "Horarios de atención." },
  ];
  const checks = checkClaims(evidence, [{ claim: "claim", terms: ["1[.,]?300", "semanas"] }]);
  assert.deepEqual(supporters(candidates, checks).map((candidate) => candidate.url), ["https://a.gov.co"]);
});
