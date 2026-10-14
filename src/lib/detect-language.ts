import type { Lang } from "./turismo/labels";

const WORDS: Record<Lang, Set<string>> = {
  en: new Set(
    "the a an on of and or with from at it there this where what how which when why who can could is are was do does i my we our you to for in near best should need want day days trip visit stay eat things place places around recommend hotels beaches restaurants".split(
      " ",
    ),
  ),
  es: new Set(
    "el la los las de del que en un una unos para por con y mi es son hay como donde dónde cual cuál cuanto cuánto puedo quiero tengo necesito al se lo qué cómo playa playas cerca hoteles mejor".split(
      " ",
    ),
  ),
  pt: new Set(
    "não você vocês onde posso quero queria ficar perto praia praias melhor melhores também uma um do da dos das em nos nas é são estou há obrigado olá viagem hotéis alojamento quais sítio isso fazer comer dormir pode na ao aos dia dias semana fim".split(
      " ",
    ),
  ),
  fr: new Set(
    "où les des une du pour dans près plage plages manger voir faire je nous vous quel quelle quels quelles meilleur meilleurs merci avec aller est sont ce cette il un le la de que qui hôtels dormir visiter peut sur jour journée semaine week-end au aux".split(
      " ",
    ),
  ),
};

const MARKS: [RegExp, Lang, number][] = [
  [/[¿¡ñ]/i, "es", 3],
  [/[ãõ]/i, "pt", 3],
  [/[èùûœ]|\bà\b/i, "fr", 3],
  [/ç/i, "pt", 1],
  [/ç/i, "fr", 1],
  [/[êâô]/i, "pt", 1],
  [/[êâô]/i, "fr", 1],
];

/** The language a message is plainly written in, judged by its own words and letters (place names aside), or null when a few words cannot tell. */
export function detectLanguage(text: string): Lang | null {
  const words = new Set(
    text
      .replace(/(?<=\s)[A-ZÁÉÍÓÚÑ][\p{L}]*/gu, " ")
      .toLowerCase()
      .match(/[\p{L}']+/gu) ?? [],
  );
  const score = Object.fromEntries((Object.keys(WORDS) as Lang[]).map((lang) => [lang, [...words].filter((word) => WORDS[lang].has(word)).length])) as Record<Lang, number>;
  for (const [pattern, lang, weight] of MARKS) if (pattern.test(text)) score[lang] += weight;
  const [best, second] = (Object.entries(score) as [Lang, number][]).sort((a, b) => b[1] - a[1]);
  return best[1] >= 2 && best[1] > second[1] ? best[0] : null;
}
