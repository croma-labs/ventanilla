import type { Detector } from "../../lib/pii";

const money = /(\$|ars|usd|u\$s)\s*$/i;
const moneyAfter = /^\s*(pesos|ars|usd|d[óo]lares|mil\b|millones|centavos)/i;

const identity = /\bdni\b|documento|identidad|\bcuil\b|\bcuit\b|\bcdi\b|pasaporte|libreta\s+(?:c[íi]vica|de\s+enrolamiento)|\bcbu\b|\bcvu\b/i;

const notMoney = (match: RegExpExecArray, text: string) => {
  const start = match.index ?? 0;
  return !money.test(text.slice(Math.max(0, start - 5), start)) && !moneyAfter.test(text.slice(start + match[0].length, start + match[0].length + 12));
};

const digits = (text: string) => text.replace(/\D/g, "").length;

export const detectors: readonly Detector[] = [
  { label: "DOCUMENTO", pattern: /\b(?:20|23|24|27|30|33|34)[\s-]?\d{8}[\s-]?\d\b/g, accept: notMoney },
  { label: "DOCUMENTO", pattern: /\b\d{1,2}\.\d{3}\.\d{3}\b/g, accept: notMoney },
  {
    label: "DOCUMENTO",
    pattern: /\b(?:dni|d\.n\.i\.?|cuil|cuit|cdi|pasaporte|documento|identidad|libreta\s+c[íi]vica|libreta\s+de\s+enrolamiento)(?:\s+(?:n[°º.o]?|n[úu]mero|nro\.?|no\.?|es|:))*\s*[:#]?\s*[A-Z]{0,3}\d[\d.\s-]{4,14}\d\b/gi,
  },
  { label: "DOCUMENTO", pattern: /\b\d{7,11}\b/g, accept: (match, text) => identity.test(text) && notMoney(match, text) },
  { label: "CUENTA", pattern: /\b\d{22}\b/g },
  { label: "CUENTA", pattern: /\b(?:cbu|cvu|cuenta|caja\s+de\s+ahorro|cuenta\s+corriente)\D{0,20}\d{6,22}\b/gi },
  {
    label: "TELEFONO",
    pattern: /(?<![\d.,$])(?!0?8[01]0)(?:\+?54[\s.-]?9?[\s.-]?)?\(?0?(?:11|[2368]\d{2,3})\)?[\s.-]?(?:15[\s.-]?)?\d{3,4}[\s.-]?\d{4}\b/g,
    accept: (match, text) => digits(match[0]) >= 10 && digits(match[0]) <= 13 && notMoney(match, text),
  },
  { label: "PLACA", pattern: /\b[A-Z]{3}[\s-]?\d{3}\b/g },
  { label: "PLACA", pattern: /\b[A-Z]{2}[\s-]?\d{3}[\s-]?[A-Z]{2}\b/g },
  {
    label: "DIRECCION",
    pattern: /\b(?:calle|avenida|av|pasaje|pje|diagonal|boulevard|bv)\.?\s+[\wáéíóúñü. ]{2,40}?\s+\d{2,5},?\s*(?:piso\s*\d+|\d{1,2}\s?[°º]\s?[a-z]?\b|depto\.?\s*\w+|dpto\.?\s*\w+|dto\.?\s*\w+|departamento\s+\w+|timbre\s+\w+|pb\b|casa\s+\d+)/gi,
  },
];
