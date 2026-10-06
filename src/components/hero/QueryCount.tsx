import { site } from "@country/site";
import { useEffect, useState } from "react";

export default function QueryCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/stats", { signal: abort.signal, credentials: "omit" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { queries?: number } | null) => typeof data?.queries === "number" && data.queries > 0 && setCount(data.queries))
      .catch(() => {});
    return () => abort.abort();
  }, []);

  return (
    <p
      data-slot="query-count"
      aria-hidden={count === null}
      className="type-body-s mt-6 text-center text-text-secondary tabular-nums opacity-0 transition-opacity duration-700 ease-out-quint data-[ready]:opacity-60"
      data-ready={count === null ? undefined : ""}
    >
      {count === null ? " " : count === 1 ? site.ui.answeredOne : site.ui.answered.replace("{n}", new Intl.NumberFormat(site.locale).format(count))}
    </p>
  );
}
