import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ type: [(value: string) => value.startsWith("site-") || /^(body|label)-/.test(value)] }],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => merge(clsx(inputs));
