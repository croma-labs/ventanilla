import type { Detector } from "../../lib/pii";

const money = /(\$|cop|usd)\s*$/i;
const moneyAfter = /^\s*(pesos|cop|millones|mil\b|usd|dólares|dolares)/i;

const identity = /c[ée]dula|documento|identificaci[óo]n|\bc\.?\s?c\.?(?=\s|$)|\bt\.?\s?i\.?(?=\s|$)|tarjeta\s+de\s+identidad|\bnit\b|pasaporte|\bppt\b|\bpep\b/i;

const notMoney = (match: RegExpExecArray, text: string) => {
  const start = match.index ?? 0;
  return !money.test(text.slice(Math.max(0, start - 5), start)) && !moneyAfter.test(text.slice(start + match[0].length, start + match[0].length + 12));
};

export const detectors: readonly Detector[] = [
  {
    label: "DOCUMENTO",
    pattern: /\b(?:c\.?\s?c\.?|c[ée]dula(?:\s+de\s+ciudadan[íi]a)?|t\.?\s?i\.?|tarjeta\s+de\s+identidad|c\.?\s?e\.?|c[ée]dula\s+de\s+extranjer[íi]a|pasaporte|documento|identificaci[óo]n|nit|ppt|pep)(?:\s+(?:n[°º.o]?|n[úu]mero|no\.?|es|:))*\s*[:#]?\s*[A-Z]{0,2}\d[\d.\s-]{4,14}\d\b/gi,
  },
  { label: "DOCUMENTO", pattern: /\b\d{1,3}(?:\.\d{3}){2,3}(?:-\d)?\b/g, accept: notMoney },
  // A bare number of a document's length anywhere in a message that talks about an identity document.
  { label: "DOCUMENTO", pattern: /\b\d{8,10}\b/g, accept: (match, text) => identity.test(text) && notMoney(match, text) },
  { label: "TELEFONO", pattern: /\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g, accept: notMoney },
  { label: "TELEFONO", pattern: /\b60\d[\s.-]?\d{3}[\s.-]?\d{4}\b/g },
  { label: "PLACA", pattern: /\b[A-Z]{3}[\s-]?\d{2}[\dA-Z]\b/g },
  { label: "CUENTA", pattern: /\b(?:cuenta|ahorros|corriente|nequi|daviplata)\D{0,20}\d{6,20}\b/gi },
  {
    label: "DIRECCION",
    pattern: /\b(?:calle|cl|carrera|cra|kr|cr|avenida|av|diagonal|dg|transversal|tv)\.?\s*\d+[a-z]?\s*(?:bis)?\s*(?:#|n[°º.o]?|no\.?)\s*\d+[a-z]?\s*-\s*\d+/gi,
  },
];
