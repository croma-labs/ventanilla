const ENGLISH = new Set("the a an on of and or with from at it there this where what how which when why who can could is are was do does i my we our you to for in near best should need want day days trip visit stay eat things place places around recommend hotels beaches restaurants".split(" "));
const SPANISH = new Set("el la los las de del que en un una unos para por con y mi es son hay como donde cual cuanto puedo quiero tengo necesito al se lo".split(" "));

function counts(question: string) {
  const words = new Set(question.replace(/(?<=\s)[A-ZÁÉÍÓÚÑ][\p{L}]*/gu, " ").toLowerCase().match(/\p{L}+/gu) ?? []);
  return { english: [...words].filter((word) => ENGLISH.has(word)).length, spanish: [...words].filter((word) => SPANISH.has(word)).length };
}

/** Whether a question is written in English, judged by its own words, place names aside. */
export function looksEnglish(question: string): boolean {
  if (/[¿¡]/.test(question)) return false;
  const { english, spanish } = counts(question);
  return english >= 2 && english > spanish;
}

/** The language a message is plainly written in, or null when a few words cannot tell. */
export function languageOfText(text: string): "en" | "es" | null {
  if (looksEnglish(text)) return "en";
  const { english, spanish } = counts(text);
  return /[¿¡ñ]/i.test(text) || (spanish >= 2 && spanish > english) ? "es" : null;
}
