import { List, Map as MapIcon, Search, SlidersHorizontal, X } from "lucide-react";
import MiniSearch from "minisearch";
import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { DEPARTMENTS, KIND_LABEL, LANGUAGE_LABEL, THEME_LABEL } from "../../lib/turismo/labels";
import { KINDS, THEMES, type IndexRow, type Kind, type Theme } from "../../lib/turismo/types";
import KindIcon from "./KindIcon";

const ExploreMap = lazy(() => import("./ExploreMap"));

type Filters = { q: string; tipo: Kind | ""; tema: Theme | ""; depto: string; idioma: string; rnt: boolean };
type View = "lista" | "mapa";

const PAGE = 48;
const EMPTY: Filters = { q: "", tipo: "", tema: "", depto: "", idioma: "", rnt: false };
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const hrefOf = (row: IndexRow) => (row.k === "guide" ? `/turismo/guias#${row.s}` : `/turismo/lugar/${row.s}`);
const chip = (active: boolean) =>
  `inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
    active ? "border-blue-700 bg-blue-700 text-white" : "border-border-tertiary bg-background-primary text-text-primary hover:bg-surface-muted"
  }`;

function readUrl(): { filters: Filters; view: View } {
  const params = new URLSearchParams(location.search);
  const tipo = params.get("tipo");
  const tema = params.get("tema");
  return {
    filters: {
      q: params.get("q") ?? "",
      tipo: KINDS.includes(tipo as Kind) ? (tipo as Kind) : "",
      tema: THEMES.includes(tema as Theme) ? (tema as Theme) : "",
      depto: DEPARTMENTS.find((name) => name === params.get("depto")) ?? "",
      idioma: params.get("idioma") ?? "",
      rnt: params.get("rnt") === "1",
    },
    view: params.get("vista") === "mapa" ? "mapa" : "lista",
  };
}

function writeUrl(filters: Filters, view: View) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.tipo) params.set("tipo", filters.tipo);
  if (filters.tema) params.set("tema", filters.tema);
  if (filters.depto) params.set("depto", filters.depto);
  if (filters.idioma) params.set("idioma", filters.idioma);
  if (filters.rnt) params.set("rnt", "1");
  if (view === "mapa") params.set("vista", "mapa");
  const query = params.toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
}

export default function ExploreApp({ total }: { total: number }) {
  const [rows, setRows] = useState<IndexRow[] | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [view, setView] = useState<View>("lista");
  const [shown, setShown] = useState(PAGE);
  const [sheet, setSheet] = useState(false);
  const deferred = useDeferredValue(filters);
  const more = useRef<HTMLDivElement>(null);
  const mapPanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initial = readUrl();
    setFilters(initial.filters);
    setView(initial.view);
    fetch("/turismo/indice.json")
      .then((response) => response.json())
      .then((data: IndexRow[]) => setRows(data));
  }, []);

  useEffect(() => writeUrl(filters, view), [filters, view]);

  useEffect(() => {
    if (view === "mapa" && rows && innerWidth < 1145) mapPanel.current?.scrollIntoView({ block: "start", behavior: "smooth" });
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
    const { q, tipo, tema, depto, idioma, rnt } = deferred;
    const pool = q.trim() && search ? search.search(q.trim()).map((hit) => rows[hit.id as number]) : rows;
    return pool.filter(
      (row) =>
        (!tipo || row.k === tipo) &&
        (!tema || row.t.includes(tema)) &&
        (!depto || row.d === depto) &&
        (!idioma || (row.l ?? []).includes(idioma)) &&
        (!rnt || row.r === 1),
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
  const active = [filters.tema, filters.depto, filters.idioma, filters.rnt ? "rnt" : ""].filter(Boolean).length;

  return (
    <div className="pt-5">
      <div className="flex gap-2">
        <label className="relative flex h-13 min-w-0 flex-1 items-center rounded-full border border-border-tertiary bg-background-primary shadow-composer-sm focus-within:border-border-primary">
          <Search size={19} className="pointer-events-none absolute left-4 text-text-tertiary" />
          <span className="sr-only">Buscar lugares</span>
          <input
            type="search"
            value={filters.q}
            onChange={(event) => set("q", event.target.value)}
            placeholder={`Busca entre ${total.toLocaleString("es-SV")} lugares`}
            className="size-full rounded-full bg-transparent pr-10 pl-11 text-[16px] outline-none placeholder:text-text-tertiary"
            enterKeyHint="search"
            autoComplete="off"
          />
          {filters.q && (
            <button type="button" onClick={() => set("q", "")} className="absolute right-3 rounded-full p-1 text-text-tertiary hover:text-text-primary" aria-label="Borrar búsqueda">
              <X size={17} />
            </button>
          )}
        </label>
        <button type="button" onClick={() => setSheet(true)} className={`relative ${chip(active > 0)} h-13 px-4`} aria-haspopup="dialog">
          <SlidersHorizontal size={18} />
          <span className="max-mobile:sr-only">Filtros</span>
          {active > 0 && <span className="ml-0.5 rounded-full bg-white px-1.5 text-[12px] font-semibold text-blue-700">{active}</span>}
        </button>
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] mobile:-mx-6 mobile:px-6 [&::-webkit-scrollbar]:hidden" role="group" aria-label="Tipo de lugar">
        <button type="button" className={chip(!filters.tipo)} onClick={() => set("tipo", "")} aria-pressed={!filters.tipo}>
          Todo
        </button>
        {KINDS.map((kind) => (
          <button type="button" key={kind} className={chip(filters.tipo === kind)} onClick={() => set("tipo", filters.tipo === kind ? "" : kind)} aria-pressed={filters.tipo === kind}>
            <KindIcon kind={kind} size={16} />
            {KIND_LABEL[kind].many}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[14px] text-text-secondary" aria-live="polite">
          {rows ? `${ordered.length.toLocaleString("es-SV")} ${ordered.length === 1 ? "lugar" : "lugares"}` : "Cargando el directorio…"}
          {filters.depto && ` en ${filters.depto}`}
        </p>
        {(active > 0 || filters.tipo || filters.q) && (
          <button type="button" onClick={() => setFilters(EMPTY)} className="text-[14px] font-medium text-blue-600 underline-offset-4 hover:underline">
            Limpiar todo
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-6 site-desktop:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className={view === "mapa" ? "max-[1145px]:hidden" : ""}>
          {rows === null ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 site-desktop:grid-cols-1">
              {Array.from({ length: 8 }, (_, i) => (
                <li key={i} className="h-24 animate-pulse rounded-[20px] bg-surface-muted" />
              ))}
            </ul>
          ) : ordered.length === 0 ? (
            <div className="rounded-24 border border-dashed border-border-tertiary p-8 text-center">
              <p className="font-serif-display text-2xl">Nada por aquí</p>
              <p className="mt-2 text-[15px] text-text-secondary">Prueba con otra palabra o quita algún filtro.</p>
              {filters.q && (
                <a href={`/?q=${encodeURIComponent(filters.q)}`} className="mt-4 inline-flex h-11 items-center rounded-full bg-blue-700 px-5 font-medium text-white">
                  Preguntar a Ventanilla
                </a>
              )}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 site-desktop:grid-cols-1">
              {ordered.slice(0, shown).map((row) => (
                <li key={row.s}>
                  <a href={hrefOf(row)} className="group flex h-full items-center gap-3 rounded-[20px] border border-border-quaternary bg-background-primary p-2.5 pr-4 transition-shadow hover:shadow-elevation-1 focus-visible:outline-2 focus-visible:outline-offset-2">
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
                        {KIND_LABEL[row.k].one}
                        {row.r === 1 && <span className="shrink-0 rounded-full bg-blue-50 px-1.5 text-[10px] font-semibold whitespace-nowrap text-blue-600">RNT</span>}
                      </span>
                      <span className="line-clamp-2 font-serif-display text-[1.3rem] leading-tight text-text-primary">{row.n}</span>
                      <span className="truncate text-[13px] text-text-secondary">
                        {[row.m, row.d].filter(Boolean).join(", ")}
                        {row.l?.length ? ` · ${row.l.map((code) => LANGUAGE_LABEL[code] ?? code).join(", ")}` : ""}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div ref={more} aria-hidden="true" />
        </div>

        <div ref={mapPanel} className={`${view === "lista" ? "max-[1145px]:hidden" : ""} scroll-mt-16 site-desktop:sticky site-desktop:top-20 site-desktop:self-start`}>
          {rows && (
            <Suspense fallback={<div className="h-[70dvh] animate-pulse rounded-24 bg-surface-muted" />}>
              <ExploreMap rows={ordered} hrefOf={hrefOf} className="h-[calc(100svh-5.5rem)] min-h-[420px] rounded-24 site-desktop:h-[calc(100dvh-7rem)]" />
            </Suspense>
          )}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30 flex justify-center site-desktop:hidden">
        <button
          type="button"
          onClick={() => setView(view === "lista" ? "mapa" : "lista")}
          className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-blue-700 px-5 font-medium text-white shadow-glass-toast transition-transform active:scale-95"
        >
          {view === "lista" ? <MapIcon size={18} /> : <List size={18} />}
          {view === "lista" ? "Ver mapa" : "Ver lista"}
        </button>
      </div>

      {sheet && (
        <FilterSheet
          filters={filters}
          onChange={setFilters}
          onClose={() => setSheet(false)}
          count={ordered.length}
        />
      )}
    </div>
  );
}

function FilterSheet({ filters, onChange, onClose, count }: { filters: Filters; onChange: (filters: Filters) => void; onClose: () => void; count: number }) {
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
      aria-label="Filtros"
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-32 bg-background-primary p-0 text-text-primary backdrop:bg-black/35 mobile:m-auto mobile:max-w-[560px] mobile:rounded-32"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div className="flex items-center justify-between border-b border-border-quaternary px-5 py-4">
          <h2 className="font-serif-display text-[1.8rem] leading-none">Filtros</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-surface-muted" aria-label="Cerrar filtros">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-7 overflow-y-auto px-5 py-5">
          <fieldset>
            <legend className="text-[13px] font-semibold tracking-wide text-text-tertiary uppercase">Departamento</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={option(!filters.depto)} onClick={() => set("depto", "")}>
                Todo el país
              </button>
              {DEPARTMENTS.map((name) => (
                <button type="button" key={name} className={option(filters.depto === name)} onClick={() => set("depto", filters.depto === name ? "" : name)}>
                  {name}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[13px] font-semibold tracking-wide text-text-tertiary uppercase">Temática</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {THEMES.map((theme) => (
                <button type="button" key={theme} className={option(filters.tema === theme)} onClick={() => set("tema", filters.tema === theme ? "" : theme)}>
                  {THEME_LABEL[theme]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[13px] font-semibold tracking-wide text-text-tertiary uppercase">Idioma del guía</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(LANGUAGE_LABEL).map(([code, label]) => (
                <button type="button" key={code} className={option(filters.idioma === code)} onClick={() => onChange({ ...filters, idioma: filters.idioma === code ? "" : code, tipo: filters.idioma === code ? filters.tipo : "guide" })}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center justify-between gap-4 rounded-[20px] bg-surface-muted p-4">
            <span>
              <span className="block font-medium">Solo inscritos en el RNT</span>
              <span className="mt-0.5 block text-[13px] text-text-secondary">Negocios en el Registro Nacional de Turismo</span>
            </span>
            <input type="checkbox" checked={filters.rnt} onChange={(event) => set("rnt", event.target.checked)} className="size-5 accent-blue-700" />
          </label>
        </div>
        <div className="flex gap-3 border-t border-border-quaternary px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => onChange({ ...EMPTY, q: filters.q, tipo: filters.tipo })} className="h-12 flex-1 rounded-full border border-border-tertiary font-medium hover:bg-surface-muted">
            Limpiar
          </button>
          <button type="button" onClick={onClose} className="h-12 flex-[2] rounded-full bg-blue-700 font-medium text-white hover:bg-blue-800">
            Ver {count.toLocaleString("es-SV")} lugares
          </button>
        </div>
      </div>
    </dialog>
  );
}
