import type { Detector } from "../../lib/pii";

const money = /(\$|usd|us\$)\s*$/i;
const moneyAfter = /^\s*(d[óo]lares|usd|mil\b|millones|centavos)/i;

const identity = /\bdui\b|documento|identidad|\bnit\b|pasaporte|carn[ée]\s+de\s+residente|\bisss\b|\bnup\b/i;

const notMoney = (match: RegExpExecArray, text: string) => {
  const start = match.index ?? 0;
  return !money.test(text.slice(Math.max(0, start - 5), start)) && !moneyAfter.test(text.slice(start + match[0].length, start + match[0].length + 12));
};

export const detectors: readonly Detector[] = [
  { label: "DOCUMENTO", pattern: /\b\d{8}\s?-\s?\d\b/g },
  { label: "DOCUMENTO", pattern: /\b\d{4}-\d{6}-\d{3}-\d\b/g },
  {
    label: "DOCUMENTO",
    pattern: /\b(?:dui|nit|nup|isss|pasaporte|carn[ée]\s+de\s+residente|documento|identidad)(?:\s+(?:n[°º.o]?|n[úu]mero|no\.?|es|:))*\s*[:#]?\s*[A-Z]{0,2}\d[\d.\s-]{4,14}\d\b/gi,
  },
  // A bare number of a document's length anywhere in a message that talks about an identity document.
  { label: "DOCUMENTO", pattern: /\b\d{9,14}\b/g, accept: (match, text) => identity.test(text) && notMoney(match, text) },
  { label: "TELEFONO", pattern: /\b(?:\+?503[\s.-]?)?[267]\d{3}[\s.-]?\d{4}\b/g, accept: notMoney },
  { label: "PLACA", pattern: /\b(?:P|A|C|M|N|MB|AB|CD|RE|PR|MI|T|V|F|E|D)\s?-?\s?\d{2,3}[\s-]?\d{3}\b/g },
  { label: "CUENTA", pattern: /\b(?:cuenta|ahorros?|corriente)\D{0,20}\d{6,20}\b/gi },
  { label: "DIRECCION", pattern: /\b(?:pasaje|pje|pol[íi]gono|pol|block|senda|calle|avenida|av|colonia|col)\.?\s+[\wáéíóúñ"]+[^,\n]{0,40},?\s*(?:casa|#|n[°º.o]?|no\.?)\s*\d+[a-z]?\b/gi },
];
