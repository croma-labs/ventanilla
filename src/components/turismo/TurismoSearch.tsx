import { ArrowUp, MessageCircle, Search } from "lucide-react";
import MiniSearch from "minisearch";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { exploreHref, guidePath, KIND_LABEL, placePath, type Lang } from "../../lib/turismo/labels";
import type { IndexRow } from "../../lib/turismo/types";
import KindIcon from "./KindIcon";

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const QUESTION = /\?|^\s*(¿|qu[eé]|d[oó]nde|c[oó]mo|cu[aá]l|cu[aá]nto|cu[aá]ndo|recomi[eé]nda|what|where|how|which|when|best|is there)\b/i;
const COPY = {
  es: { ask: "Preguntar a Ventanilla", search: "Buscar", answer: "Respuesta con fuentes oficiales" },
  en: { ask: "Ask Ventanilla", search: "Search", answer: "An answer with official sources" },
};

export default function TurismoSearch({ placeholder, prompts, lang }: { placeholder: string; prompts: string[]; lang: Lang }) {
  const copy = COPY[lang];
  const hrefOf = (row: IndexRow) => (row.k === "guide" ? guidePath(row.s, lang) : placePath({ slug: row.s }, lang));
  const [rows, setRows] = useState<IndexRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const list = useId();
  const loading = useRef(false);

  const load = () => {
    if (loading.current) return;
    loading.current = true;
    fetch("/turismo/indice.json")
      .then((response) => response.json())
      .then((data: IndexRow[]) => setRows(data));
  };

  const engine = useMemo(() => {
    if (!rows) return null;
    const search = new MiniSearch<IndexRow & { id: number }>({ fields: ["n", "m", "d"], storeFields: [], processTerm: (term) => fold(term), searchOptions: { prefix: true, fuzzy: 0.2, boost: { n: 3 }, combineWith: "AND" } });
    search.addAll(rows.map((row, id) => ({ ...row, id })));
    return search;
  }, [rows]);

  const asking = QUESTION.test(query);
  const hits = useMemo(() => {
    if (!engine || !rows || query.trim().length < 2 || asking) return [];
    return engine
      .search(query.trim())
      .slice(0, 6)
      .map((hit) => rows[hit.id as number]);
  }, [engine, rows, query, asking]);

  useEffect(() => setActive(-1), [query]);

  const go = (href: string) => location.assign(href);
  const submit = () => {
    const text = query.trim();
    if (!text) return;
    if (active >= 0 && hits[active]) return go(hrefOf(hits[active]));
    go(asking ? `/?q=${encodeURIComponent(text)}` : exploreHref(lang, { q: text }));
  };

  return (
    <div className="relative w-full">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex h-16 items-center gap-2 rounded-full bg-white pr-2 pl-5 text-text-primary shadow-elevation-1 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-white/80"
      >
        {asking ? <MessageCircle size={20} className="shrink-0 text-blue-500" /> : <Search size={20} className="shrink-0 text-text-tertiary" />}
        <label className="min-w-0 flex-1">
          <span className="sr-only">{placeholder}</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              load();
              setOpen(true);
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(index + 1, hits.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, -1));
              }
            }}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={open && hits.length > 0}
            aria-controls={list}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${list}-${active}` : undefined}
            enterKeyHint={asking ? "send" : "search"}
            autoComplete="off"
            className="h-12 w-full bg-transparent text-[17px] outline-none placeholder:text-text-tertiary"
          />
        </label>
        <button type="submit" className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white transition-transform active:scale-95" aria-label={asking ? copy.ask : copy.search}>
          <ArrowUp size={20} />
        </button>
      </form>
      {open && (hits.length > 0 || asking) && (
        <ul id={list} role="listbox" className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-24 bg-white p-2 text-text-primary shadow-glass-toast ring-1 ring-black/5">
          {asking ? (
            <li role="option" aria-selected="true">
              <button type="button" onMouseDown={submit} className="flex w-full items-center gap-3 rounded-16 p-3 text-left hover:bg-surface-muted">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <MessageCircle size={18} />
                </span>
                <span>
                  <span className="block text-[15px] font-medium">{copy.ask}</span>
                  <span className="block text-[13px] text-text-secondary">{copy.answer}</span>
                </span>
              </button>
            </li>
          ) : (
            hits.map((row, index) => (
              <li key={row.s} id={`${list}-${index}`} role="option" aria-selected={index === active}>
                <a href={hrefOf(row)} className={`flex items-center gap-3 rounded-16 p-2.5 ${index === active ? "bg-surface-muted" : "hover:bg-surface-muted"}`}>
                  <span className="size-11 shrink-0 overflow-hidden rounded-12 bg-surface-muted">
                    {row.i ? <img src={row.i} alt="" className="size-full object-cover" width={44} height={44} /> : <span className="flex size-full items-center justify-center"><KindIcon kind={row.k} size={18} className="text-text-tertiary" /></span>}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium">{row.n}</span>
                    <span className="block truncate text-[13px] text-text-secondary">
                      {KIND_LABEL[lang][row.k].one} · {[row.m, row.d].filter(Boolean).join(", ")}
                    </span>
                  </span>
                </a>
              </li>
            ))
          )}
        </ul>
      )}
      {prompts.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {prompts.map((prompt) => (
            <a key={prompt} href={`/?q=${encodeURIComponent(prompt)}`} rel="nofollow" className="rounded-full bg-white/15 px-3.5 py-2 text-[14px] text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-white/25">
              {prompt}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
