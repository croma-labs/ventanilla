/** "sin" and "no" stay: they turn a question into its opposite. */
const stopwords = new Set(
  "a al ante como con cual cuales cuando de del desde donde el ella en entre es esta este esto hay la las le les lo los me mi mis para pero por que qué se si sobre su sus te tu tus un una uno y o hacer hago puedo debo necesito quiero cómo como saco sacar the of to and for in on how do i my".split(" "),
);

export const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const keywords = (text: string) => [...new Set(fold(text).split(" ").filter((word) => word.length > 1 && !stopwords.has(word)))].sort().join(" ");
