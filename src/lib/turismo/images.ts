import { getImage } from "astro:assets";

export type Picture = { src: string; srcset: string };

/** A remote photo, resized and re-encoded by the image service, so the page only ever loads same-origin images. */
export async function picture(src: string | null | undefined, widths: readonly number[] = [480, 800, 1200]): Promise<Picture | null> {
  if (!src) return null;
  const largest = widths.at(-1) ?? 1200;
  const image = await getImage({ src, width: largest, height: Math.round((largest * 2) / 3), widths: [...widths], format: "webp", quality: 72 });
  return { src: image.src, srcset: image.srcSet.attribute };
}
