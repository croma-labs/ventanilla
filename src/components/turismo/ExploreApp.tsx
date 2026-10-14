import { List, Map as MapIcon, Search, SlidersHorizontal, X } from "lucide-react";
import MiniSearch from "minisearch";
import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { DEPARTMENTS, guidePath, KIND_LABEL, LANGUAGE_LABEL, LOCALE, MAP_VIEW, PARAM, placePath, sectionPath, THEME_LABEL, type Filter, type Lang } from "../../lib/turismo/labels";
import { KINDS, THEMES, type IndexRow, type Kind, type Theme } from "../../lib/turismo/types";
import KindIcon from "./KindIcon";

const ExploreMap = lazy(() => import("./ExploreMap"));

type Filters = { q: string; kind: Kind | ""; theme: Theme | ""; department: string; language: string; registered: boolean };
type View = "list" | "map";

const PAGE = 48;
const EMPTY: Filters = { q: "", kind: "", theme: "", department: "", language: "", registered: false };
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const COPY = {
  es: {
    search: "Buscar lugares",
    placeholder: (total: string) => `Busca entre ${total} lugares`,
    clearSearch: "Borrar búsqueda",
    filters: "Filtros",
    kinds: "Tipo de lugar",
    all: "Todo",
    count: (count: string, one: boolean) => `${count} ${one ? "lugar" : "lugares"}`,
    loading: "Cargando el directorio…",
    in: (department: string) => ` en ${department}`,
    clearAll: "Limpiar todo",
    emptyTitle: "Nada por aquí",
    emptyBody: "Prueba con otra palabra o quita algún filtro.",
    ask: "Preguntar a Ventanilla",
    showMap: "Ver mapa",
    showList: "Ver lista",
    closeFilters: "Cerrar filtros",
    department: "Departamento",
    country: "Todo el país",
    theme: "Temática",
    guideLanguage: "Idioma del guía",
    registered: "Solo inscritos en el RNT",
    registeredHint: "Negocios en el Registro Nacional de Turismo",
    clear: "Limpiar",
    show: (count: string) => `Ver ${count} lugares`,
  },
  en: {
    search: "Search places",
    placeholder: (total: string) => `Search ${total} places`,
    clearSearch: "Clear search",
    filters: "Filters",
    kinds: "Type of place",
    all: "All",
    count: (count: string, one: boolean) => `${count} ${one ? "place" : "places"}`,
    loading: "Loading the directory…",
    in: (department: string) => ` in ${department}`,
    clearAll: "Clear all",
    emptyTitle: "Nothing here",
    emptyBody: "Try another word or remove a filter.",
    ask: "Ask Ventanilla",
    showMap: "Show map",
    showList: "Show list",
    closeFilters: "Close filters",
    department: "Department",
    country: "Whole country",
    theme: "Theme",
    guideLanguage: "Guide's language",
    registered: "Only RNT-listed",
    registeredHint: "Businesses in the National Tourism Registry",
    clear: "Clear",
    show: (count: string) => `Show ${count} places`,
  },
};

const hrefOf = (lang: Lang) => (row: IndexRow) => (row.k === "guide" ? guidePath(row.s, lang) : placePath({ slug: row.s }, lang));
const chip = (active: boolean) =>
  `inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
    active ? "border-blue-700 bg-blue-700 text-white" : "border-border-tertiary bg-background-primary text-text-primary hover:bg-surface-muted"
  }`;

function readUrl(lang: Lang): { filters: Filters; view: View } {
  const params = new URLSearchParams(location.search);
  const get = (filter: Filter) => params.get(PARAM[lang][filter]) ?? "";
  const kind = get("kind");
  const theme = get("theme");
  return {
    filters: {
      q: get("q"),
      kind: KINDS.includes(kind as Kind) ? (kind as Kind) : "",
      theme: THEMES.includes(theme as Theme) ? (theme as Theme) : "",
      department: DEPARTMENTS.find((name) => name === get("department")) ?? "",
      language: get("language"),
      registered: get("registered") === "1",
    },
    view: get("view") === MAP_VIEW[lang] ? "map" : "list",
  };
}

function writeUrl(lang: Lang, filters: Filters, view: View) {
  const query = (to: Lang) => {
    const params = new URLSearchParams();
    if (filters.q) params.set(PARAM[to].q, filters.q);
    if (filters.kind) params.set(PARAM[to].kind, filters.kind);
    if (filters.theme) params.set(PARAM[to].theme, filters.theme);
    if (filters.department) params.set(PARAM[to].department, filters.department);
    if (filters.language) params.set(PARAM[to].language, filters.language);
    if (filters.registered) params.set(PARAM[to].registered, "1");
    if (view === "map") params.set(PARAM[to].view, MAP_VIEW[to]);
    const text = params.toString();
    return text ? `?${text}` : "";
  };
  history.replaceState(null, "", `${location.pathname}${query(lang)}`);
  const other: Lang = lang === "en" ? "es" : "en";
  const toggle = document.querySelector<HTMLAnchorElement>("[data-language-switch]");
  if (toggle) toggle.href = `${sectionPath("explore", other)}${query(other)}`;
}

export default function ExploreApp({ total, lang }: { total: number; lang: Lang }) {
  const copy = COPY[lang];
  const linkOf = useMemo(() => hrefOf(lang), [lang]);
  const number = (value: number) => value.toLocaleString(LOCALE[lang]);
  const [rows, setRows] = useState<IndexRow[] | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [view, setView] = useState<View>("list");
  const [shown, setShown] = useState(PAGE);
  const [sheet, setSheet] = useState(false);
  const deferred = useDeferredValue(filters);
  const more = useRef<HTMLDivElement>(null);
  const mapPanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initial = readUrl(lang);
    setFilters(initial.filters);
    setView(initial.view);
    fetch("/turismo/indice.json")
      .then((response) => response.json())
      .then((data: IndexRow[]) => setRows(data));
  }, []);

  useEffect(() => writeUrl(lang, filters, view), [lang, filters, view]);

  useEffect(() => {
    if (view === "map" && rows && innerWidth < 1145) mapPanel.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [view, rows]);
  useEffect(() => setShown(PAGE), [deferred]);

  const search = useMemo(() => {
    if (!rows) return null;
    const engine = new MiniSearch<IndexRow & { id: number }>({
      fields: ["n", "m", "d"],
      storeFields: [],
      processTerm: (term) => fold(term),
      searchOptions: { prefix: true, fuzzy: 0.2, boost: { n: 3 }, combineWith: "AND" },
    });
    engine.addAll(rows.map((row, id) => ({ ...row, id })));
    return engine;
  }, [rows]);

  const results = useMemo(() => {
    if (!rows) return [];
    const { q, kind, theme, department, language, registered } = deferred;
    const pool = q.trim() && search ? search.search(q.trim()).map((hit) => rows[hit.id as number]) : rows;
    return pool.filter(
      (row) =>
        (!kind || row.k === kind) &&
        (!theme || row.t.includes(theme)) &&
        (!department || row.d === department) &&
        (!language || (row.l ?? []).includes(language)) &&
        (!registered || row.r === 1),
    );
  }, [rows, search, deferred]);

  const ordered = useMemo(
    () => (deferred.q.trim() ? results : [...results].sort((a, b) => Number(!!b.i && b.k === "destination") - Number(!!a.i && a.k === "destination") || b.r - a.r)),
    [results, deferred.q],
  );

  useEffect(() => {
    if (!more.current) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && setShown((count) => count + PAGE), { rootMargin: "600px" });
    observer.observe(more.current);
    return () => observer.disconnect();
  }, [rows, view]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const active = [filters.theme, filters.department, filters.language, filters.registered ? "registered" : ""].filter(Boolean).length;

  return (
    <div className="pt-5">
      <div className="flex gap-2">
        <label className="relative flex h-13 min-w-0 flex-1 items-center rounded-full border border-border-tertiary bg-background-primary shadow-composer-sm focus-within:border-border-primary">
          <Search size={19} className="pointer-events-none absolute left-4 text-text-tertiary" />
          <span className="sr-only">{copy.search}</span>
          <input
            type="search"
            value={filters.q}
            onChange={(event) => set("q", event.target.value)}
            placeholder={copy.placeholder(number(total))}
            className="size-full rounded-full bg-transparent pr-10 pl-11 text-[16px] outline-none placeholder:text-text-tertiary"
            enterKeyHint="search"
            autoComplete="off"
          />
          {filters.q && (
            <button type="button" onClick={() => set("q", "")} className="absolute right-3 rounded-full p-1 text-text-tertiary hover:text-text-primary" aria-label={copy.clearSearch}>
              <X size={17} />
            </button>
          )}
        </label>
        <button type="button" onClick={() => setSheet(true)} className={`relative ${chip(active > 0)} h-13 px-4`} aria-haspopup="dialog">
          <SlidersHorizontal size={18} />
          <span className="max-mobile:sr-only">{copy.filters}</span>
          {active > 0 && <span className="ml-0.5 rounded-full bg-white px-1.5 text-[12px] font-semibold text-blue-700">{active}</span>}
        </button>
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] mobile:-mx-6 mobile:px-6 [&::-webkit-scrollbar]:hidden" role="group" aria-label={copy.kinds}>
        <button type="button" className={chip(!filters.kind)} onClick={() => set("kind", "")} aria-pressed={!filters.kind}>
          {copy.all}
        </button>
        {KINDS.map((kind) => (
          <button type="button" key={kind} className={chip(filters.kind === kind)} onClick={() => set("kind", filters.kind === kind ? "" : kind)} aria-pressed={filters.kind === kind}>
            <KindIcon kind={kind} size={16} />
            {KIND_LABEL[lang][kind].many}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[14px] text-text-secondary" aria-live="polite">
          {rows ? copy.count(number(ordered.length), ordered.length === 1) : copy.loading}
          {filters.department && copy.in(filters.department)}
        </p>
        {(active > 0 || filters.kind || filters.q) && (
          <button type="button" onClick={() => setFilters(EMPTY)} className="text-[14px] font-medium text-blue-600 underline-offset-4 hover:underline">
            {copy.clearAll}
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-6 site-desktop:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className={view === "map" ? "max-[1145px]:hidden" : ""}>
          {rows === null ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 site-desktop:grid-cols-1">
              {Array.from({ length: 8 }, (_, i) => (
                <li key={i} className="h-24 animate-pulse rounded-[20px] bg-surface-muted" />
              ))}
            </ul>
          ) : ordered.length === 0 ? (
            <div className="rounded-24 border border-dashed border-border-tertiary p-8 text-center">
              <p className="font-serif-display text-2xl">{copy.emptyTitle}</p>
              <p className="mt-2 text-[15px] text-text-secondary">{copy.emptyBody}</p>
              {filters.q && (
                <a href={`/?q=${encodeURIComponent(filters.q)}`} className="mt-4 inline-flex h-11 items-center rounded-full bg-blue-700 px-5 font-medium text-white">
                  {copy.ask}
                </a>
              )}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 site-desktop:grid-cols-1">
              {ordered.slice(0, shown).map((row) => (
                <li key={row.s}>
                  <a href={linkOf(row)} className="group flex h-full items-center gap-3 rounded-[20px] border border-border-quaternary bg-background-primary p-2.5 pr-4 transition-shadow hover:shadow-elevation-1 focus-visible:outline-2 focus-visible:outline-offset-2">
                    <span className="relative size-20 shrink-0 overflow-hidden rounded-[14px] bg-surface-muted">
                      {row.i ? (
                        <img src={row.i} alt="" width={80} height={80} loading="lazy" decoding="async" className={`size-full object-cover ${row.k === "destination" || row.k === "attraction" ? "" : "opacity-75 saturate-[.85]"}`} />
                      ) : (
                        <span className="flex size-full items-center justify-center bg-gradient-to-br from-blue-50 to-[#fdf3dc]">
                          <KindIcon kind={row.k} size={26} className="text-text-tertiary" />
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary">
                        <KindIcon kind={row.k} size={13} />
                        {KIND_LABEL[lang][row.k].one}
                        {row.r === 1 && <span className="shrink-0 rounded-full bg-blue-50 px-1.5 text-[10px] font-semibold whitespace-nowrap text-blue-600">RNT</span>}
                      </span>
                      <span className="line-clamp-2 font-serif-display text-[1.3rem] leading-tight text-text-primary">{row.n}</span>
                      <span className="truncate text-[13px] text-text-secondary">
                        {[row.m, row.d].filter(Boolean).join(", ")}
                        {row.l?.length ? ` · ${row.l.map((code) => LANGUAGE_LABEL[lang][code] ?? code).join(", ")}` : ""}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div ref={more} aria-hidden="true" />
        </div>

        <div ref={mapPanel} className={`${view === "list" ? "max-[1145px]:hidden" : ""} scroll-mt-16 site-desktop:sticky site-desktop:top-20 site-desktop:self-start`}>
          {rows && (
            <Suspense fallback={<div className="h-[70dvh] animate-pulse rounded-24 bg-surface-muted" />}>
              <ExploreMap rows={ordered} hrefOf={linkOf} lang={lang} className="h-[calc(100svh-5.5rem)] min-h-[420px] rounded-24 site-desktop:h-[calc(100dvh-7rem)]" />
            </Suspense>
          )}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30 flex justify-center site-desktop:hidden">
        <button
          type="button"
          onClick={() => setView(view === "list" ? "map" : "list")}
          className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-blue-700 px-5 font-medium text-white shadow-glass-toast transition-transform active:scale-95"
        >
          {view === "list" ? <MapIcon size={18} /> : <List size={18} />}
          {view === "list" ? copy.showMap : copy.showList}
        </button>
      </div>

      {sheet && (
        <FilterSheet
          filters={filters}
          onChange={setFilters}
          onClose={() => setSheet(false)}
          count={ordered.length}
          lang={lang}
        />
      )}
    </div>
  );
}

function FilterSheet({ filters, onChange, onClose, count, lang }: { filters: Filters; onChange: (filters: Filters) => void; onClose: () => void; count: number; lang: Lang }) {
  const copy = COPY[lang];
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  const option = (active: boolean) =>
    `inline-flex h-10 items-center rounded-full border px-4 text-[14px] font-medium transition-colors ${active ? "border-blue-700 bg-blue-700 text-white" : "border-border-tertiary hover:bg-surface-muted"}`;

  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
      aria-label={copy.filters}
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-32 bg-background-primary p-0 text-text-primary backdrop:bg-black/35 mobile:m-auto mobile:max-w-[560px] mobile:rounded-32"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div className="flex items-center justify-between border-b border-border-quaternary px-5 py-4">
          <h2 className="font-serif-display text-[1.8rem] leading-none">{copy.filters}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-surface-muted" aria-label={copy.closeFilters}>
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-7 overflow-y-auto px-5 py-5">
          <fieldset>
            <legend className="text-[13px] font-semibold tracking-wide text-text-tertiary uppercase">{copy.department}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={option(!filters.department)} onClick={() => set("department", "")}>
                {copy.country}
              </button>
              {DEPARTMENTS.map((name) => (
                <button type="button" key={name} className={option(filters.department === name)} onClick={() => set("department", filters.department === name ? "" : name)}>
                  {name}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[13px] font-semibold tracking-wide text-text-tertiary uppercase">{copy.theme}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {THEMES.map((theme) => (
                <button type="button" key={theme} className={option(filters.theme === theme)} onClick={() => set("theme", filters.theme === theme ? "" : theme)}>
                  {THEME_LABEL[lang][theme]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[13px] font-semibold tracking-wide text-text-tertiary uppercase">{copy.guideLanguage}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(LANGUAGE_LABEL[lang]).map(([code, label]) => (
                <button type="button" key={code} className={option(filters.language === code)} onClick={() => onChange({ ...filters, language: filters.language === code ? "" : code, kind: filters.language === code ? filters.kind : "guide" })}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center justify-between gap-4 rounded-[20px] bg-surface-muted p-4">
            <span>
              <span className="block font-medium">{copy.registered}</span>
              <span className="mt-0.5 block text-[13px] text-text-secondary">{copy.registeredHint}</span>
            </span>
            <input type="checkbox" checked={filters.registered} onChange={(event) => set("registered", event.target.checked)} className="size-5 accent-blue-700" />
          </label>
        </div>
        <div className="flex gap-3 border-t border-border-quaternary px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => onChange({ ...EMPTY, q: filters.q, kind: filters.kind })} className="h-12 flex-1 rounded-full border border-border-tertiary font-medium hover:bg-surface-muted">
            {copy.clear}
          </button>
          <button type="button" onClick={onClose} className="h-12 flex-[2] rounded-full bg-blue-700 font-medium text-white hover:bg-blue-800">
            {copy.show(count.toLocaleString(LOCALE[lang]))}
          </button>
        </div>
      </div>
    </dialog>
  );
}
