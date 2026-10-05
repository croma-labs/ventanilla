# Contributing

Thanks for helping. Issues and pull requests are welcome in English or Spanish.

## Setup

```bash
nvm use                      # Node 24
npm install
cp .env.example .env.local
npm run dev                  # http://localhost:5201
```

You need a `CROMA_API_KEY` ([docs.usecroma.com](https://docs.usecroma.com)) and a `GROQ_API_KEY` (or `ANTHROPIC_API_KEY` with `AI_PROVIDER=anthropic`) to get answers. The landing page and trámite guides render without keys.

Before opening a pull request:

```bash
npm run check
npm run build
```

If you change prompts, tools or verification, run `npm run eval` against your dev server (set `EVAL_KEY` in `.env.local`) and include the before and after numbers.

## Ground rules

- **Official sources only.** Answers and trámite guides must come from official domains. Content changes need a link to the source.
- **No personal data.** Never add lookups by a person's document number, and never put real user questions, cédulas, phones or plates in code, fixtures, evals or screenshots.
- **Not an official site.** Don't add government seals, coats of arms or banners, or copy that suggests Ventanilla is run by a government.
- **Match the surrounding code.** Keep changes focused; one concern per pull request.

## Adding a country

See [Add a country](README.md#add-a-country) and open an issue with the "Add a country" template first, so we can agree on the sources.

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
