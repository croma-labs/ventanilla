export const clamp = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value));

export const clamp01 = (value: number) => clamp(0, 1, value);

export const wrap = (min: number, max: number, value: number) => {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
};

export const window01 = (index: number, count: number, span: number) => {
  const start = (index / Math.max(1, count - 1)) * (1 - span);
  return { start, end: start + span };
};
