# Security

Ventanilla handles citizens' questions about government services, so we take privacy and abuse seriously.

## How it is protected

| Layer | What it does |
| - | - |
| Browser | Detects cédulas, NIT, phones, emails, plates, accounts and addresses, and blocks sending until removed. No cookies or third-party requests; page views are counted with Vercel Web Analytics, served from the same origin. |
| Server | Scrubs the same patterns again before anything reaches the model or Croma. |
| History | Assistant turns are HMAC-signed. Unsigned or forged turns are dropped. |
| Abuse | 6 requests a minute and 80 a day per client, keyed by `HMAC(secret, day + IP)` with IPv6 grouped by /64. Same-origin and `Sec-Fetch-Site` checks, JSON only, 24 KB body cap. |
| Output | Links render only for `https` URLs on official domains that the tools returned. Tool output is treated as data, not instructions. |
| Icons | `/api/icon` serves official domains only, caps size, rate-limits cache misses and responds with a sandbox CSP. |
| Headers | CSP with `connect-src 'self'`, `Referrer-Policy: no-referrer`, frame denial, a locked-down Permissions-Policy and HSTS (`vercel.json`). |
| Logs | Timings, tool names and cache hits only. Never message content. |
| Journal | Each scrubbed question and its answer are kept in Redis for 7 days for the weekly review (`JOURNAL_RETENTION_SECONDS`; `0` turns it off). No IP or client key is stored with them, and evaluation traffic is never journaled. |
| Caches | Answers for up to 30 days and source lookups for up to 7 days, keyed by a hash of the question or query. |

## Reporting

Please report vulnerabilities privately through [GitHub security advisories](https://github.com/croma-labs/ventanilla/security/advisories/new). Do not open a public issue.

Include the steps to reproduce and the impact. We aim to reply within 3 business days.

## In scope

- Personal data reaching the model, Croma, logs or caches despite the scrubbers
- Bypassing rate limits, origin checks or the HMAC signing of assistant turns
- Prompt injection that makes the assistant link to non-official URLs or present invented sources as official
- XSS or CSP bypasses, and abuse of `/api/icon`

## Out of scope

- Wrong or outdated answers. Open a regular issue with the official source instead.
- Volumetric denial of service
