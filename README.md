# Ventanilla

A citizen assistant for government services, one country at a time. It answers questions about procedures, rights and laws using only official sources, through [Croma](https://docs.usecroma.com). Colombia ships first, and the country layer is designed to be swapped.

Ventanilla is an independent project. It is not an official government site, and it must not use a government's seals, banners or branding.

## Run it

```bash
nvm use            # Node 24
npm install
cp .env.example .env.local   # CROMA_API_KEY, GROQ_API_KEY, VENTANILLA_SECRET
npm run dev        # http://localhost:5201
```

`COUNTRY=co` selects the country at build time (default `co`).

## How a question is answered

```
question ──▶ guard ──▶ answer cache ──hit──▶ replay (~0.5 s)
                            │ miss
                            ├─▶ web search on official portals (site:gov.co), started immediately
                            ▼
                     1. research   model picks normative datasets (Función Pública, Corte
                                   Constitucional, DIAN); web results merge in; forced unless small talk
                     2. draft      written from the results, never shown to the user
                     3. verify     fast model lists every claim with 2 to 4 key-term regexes generated
                                   for this answer; the server matches them against the source text
                                   (all terms within 800 chars); misses get one retry with new terms
                     4. rewrite    final answer from the draft and checks: unsupported claims removed,
                                   links only to URLs the sources returned, streamed to the user
                            ▼
                     answer + "Fuentes" chip (official domains only) + follow-ups
```

- **Sources are required.** Every non-small-talk question queries official sources before answering. The chip lists only official sources the answer actually cites. If nothing could be confirmed, the answer says so and shows a "no verificada" notice.
- **Web first.** The official web search starts with the question and runs alongside the model's first decision. A slow source misses the soft deadline, keeps running in the background and caches its result for the next person.
- **Caches** live in Upstash, with in-memory fallback.
  - Croma results: 24 h web search, 12 h datasets, 7 d page reads. Empty results are never cached.
  - Web search keys are normalized keyword sets, so paraphrases hit.
  - First-turn answers are cached for 6 h, but only if they passed verification.
- **Async Croma jobs.** Responses use `Prefer: wait=20` and then poll `status_url`. Concurrent identical calls are coalesced, network errors are retried once, and `Idempotency-Key` is the cache hash.

## Entity icons

Sources show each entity's official icon, served from our own origin so the browser never contacts a government site.

- `npm run icons` downloads icons for the entities in `src/countries/<code>/site.ts` into `public/icons/<code>/` and writes `icons.json`. Icons are checked by their actual bytes, and SVGs with scripts are rejected.
- Sites with incomplete certificate chains are fetched with a curl fallback. Sites behind a Cloudflare challenge (Registraduría, Policía) need a headed browser once.
- Any other official domain is fetched at runtime by `/api/icon?d=`. It only serves official domains, caps size, caches 30 days in Redis and the CDN, and responds with a sandbox CSP.
- An entity without an icon shows initials, or its parent's icon through `iconFrom`.

## Privacy and security

| Layer | What it does |
| - | - |
| Browser | Detects cédulas, NIT, phones, emails, plates, accounts and addresses, and blocks sending until removed. No voice or upload buttons, no cookies, no analytics, no third-party requests, self-hosted fonts. |
| Server | Scrubs the same patterns again before anything reaches the model or Croma. The model and Croma only see the question, never the IP or any identifier. |
| History | Assistant turns are HMAC-signed. Unsigned or forged turns are dropped, so a client cannot inject fake assistant messages. |
| Abuse | Per-client limits of 6/min and 80/day, keyed by `HMAC(secret, day + IP)`. No raw IP is stored, and keys rotate daily. Same-origin and `Sec-Fetch-Site` checks, JSON-only, 24 KB body cap. |
| Output | Links render only when they point to a URL the tools actually returned. Invented links become plain text. Tool output is treated as data, not instructions. |
| Headers | Strict CSP (`connect-src 'self'`), `Referrer-Policy: no-referrer`, frame denial, a locked-down Permissions-Policy, and HSTS in production (`vercel.json`). |
| Logs | Timings, tool names and cache hits only. Never message content. |

## Add a country

1. Create `src/countries/<code>/`:
   - `site.ts`: all copy, hero prompts and colors, flag stripes, entity domains and names, official domain suffixes, and personal-data detectors. Typed by `Site` in `src/countries/types.ts`.
   - `pii.ts`: regex detectors for that country's IDs, phones, plates and addresses.
   - `assistant.ts`: the tool set and system prompt. Reuse `webSearch({ hint, scope })` and `readPage` from `src/server/tools/global.ts`. Wrap the country's Croma datasets with `cromaTool()` in `src/server/tools/<code>.ts` and combine them with `fanOut()`.
2. Build with `COUNTRY=<code>`.

Peru (`/pe/...`), Mexico (`/mx/...`), Brazil (`/br/...`), El Salvador and the US already have Croma endpoints. Only person-free, informational endpoints belong in the assistant. Lookups by a person's document number stay out on purpose.

## Models

The default is Groq `qwen/qwen3.8-27b`, which tested the most faithful to its sources. Override it with `GROQ_MODEL`, or set `AI_PROVIDER=anthropic` with `ANTHROPIC_API_KEY`. `openai/gpt-oss-120b` was faster at reasoning but invented costs and URLs in testing.
