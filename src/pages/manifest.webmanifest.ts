import { site } from "@country/site";
import type { APIRoute } from "astro";

export const GET: APIRoute = () =>
  Response.json({
    name: site.brand.name,
    short_name: site.brand.name,
    description: site.meta.description,
    lang: site.locale,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  });
