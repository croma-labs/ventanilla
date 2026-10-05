import { defineMiddleware } from "astro:middleware";
import config from "../vercel.json";

const headers = config.headers[0].headers.filter(({ key }) => import.meta.env.PROD || key !== "Strict-Transport-Security");

export const onRequest = defineMiddleware(async (_, next) => {
  const response = await next();
  for (const { key, value } of headers) if (!response.headers.has(key)) response.headers.set(key, import.meta.env.DEV ? value.replace("; upgrade-insecure-requests", "").replace("connect-src 'self'", "connect-src 'self' ws:") : value);
  return response;
});
