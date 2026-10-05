export type Span = { start: number; end: number; label: string };

export type Detector = { label: string; pattern: RegExp; accept?: (match: RegExpExecArray, text: string) => boolean };

const luhn = (digits: string) => {
  let sum = 0;
  for (let index = 0; index < digits.length; index++) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
    sum += digit;
  }
  return sum % 10 === 0;
};

export const universal: readonly Detector[] = [
  { label: "EMAIL", pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { label: "TARJETA", pattern: /\b(?:\d[ -]?){13,19}\b/g, accept: (match) => luhn(match[0].replace(/\D/g, "")) },
  { label: "TELEFONO", pattern: /\+\d{1,3}[\s.-]?(?:\(?\d{1,4}\)?[\s.-]?){2,5}\d{2,4}/g },
];

export function findSensitive(text: string, detectors: readonly Detector[]): Span[] {
  const spans: Span[] = [];
  for (const detector of [...universal, ...detectors]) {
    for (const match of text.matchAll(new RegExp(detector.pattern.source, detector.pattern.flags.includes("g") ? detector.pattern.flags : `${detector.pattern.flags}g`))) {
      if (detector.accept && !detector.accept(match as RegExpExecArray, text)) continue;
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (!spans.some((span) => start < span.end && end > span.start)) spans.push({ start, end, label: detector.label });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}

export function scrub(text: string, detectors: readonly Detector[]) {
  const spans = findSensitive(text, detectors);
  let out = "";
  let cursor = 0;
  for (const span of spans) {
    out += `${text.slice(cursor, span.start)}[${span.label}]`;
    cursor = span.end;
  }
  return { text: out + text.slice(cursor), redacted: spans.length };
}
