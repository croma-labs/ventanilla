import { Dialog } from "@base-ui/react/dialog";
import { site } from "@country/site";
import { motion } from "motion/react";
import type { Grounding } from "../../lib/ui-stream";
import { cn } from "../../lib/cn";
import { buttonBase, buttonSecondary, focusRing } from "../../lib/ui";
import { CloseIcon } from "../icons";
import EntityIcon from "./EntityIcon";
import { groupByAgency, hostOf } from "./sources";

const outQuint = [0.22, 1, 0.36, 1] as const;

const cleanTitle = (title: string) => title.split(/\s[|·–-]\s/)[0].trim();

const label = (domain: string) => domain.charAt(0).toUpperCase() + domain.slice(1);

export function SourcesChip({ groundings }: { groundings: Grounding[] }) {
  const groups = groupByAgency(groundings);
  const badges = groups.slice(0, 3);
  const name = groups.length === 1 ? label(groups[0].domain) : site.ui.sources;
  return (
    <Dialog.Root>
      <motion.div initial={{ width: 0 }} animate={{ width: "auto" }} transition={{ duration: 0.6, ease: outQuint }} className="flex shrink-0 overflow-clip focus-within:overflow-visible">
        <Dialog.Trigger
          aria-label={`${site.ui.officialSources}: ${groups.map((group) => group.agency.name).join(", ")}`}
          className={cn(buttonBase, buttonSecondary, "h-9 min-h-9 gap-1.5 rounded-full py-1.5 pr-3 pl-1.5 type-label-s font-medium tracking-[0] text-secondary hover:text-primary")}
        >
          <span className="flex items-center -space-x-2">
            {badges.map((group, index) => (
              <motion.span key={group.domain} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.08, duration: 0.6, ease: "linear" }}>
                <span className="grid size-6 place-items-center overflow-hidden rounded-full border border-border-tertiary bg-background-primary">
                  <span className="size-[18px]">
                    <EntityIcon domain={group.agency.icon} short={group.agency.short} />
                  </span>
                </span>
              </motion.span>
            ))}
          </span>
          <span className="min-w-0 truncate leading-normal">{name}</span>
        </Dialog.Trigger>
      </motion.div>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(680px,calc(100vh-112px))] w-[min(432px,calc(100%-32px))] -translate-1/2 flex-col overflow-hidden rounded-32 bg-background-primary text-text-primary shadow-[2px_11px_24px_#0000001a,8px_42px_43px_#00000017] transition-[opacity,scale] duration-300 ease-out-quint outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-4">
            <Dialog.Title className="type-body-m font-medium">{site.ui.officialSources}</Dialog.Title>
            <Dialog.Close aria-label={site.ui.close} className={cn(buttonBase, "size-10 rounded-full bg-blue-900/5 hover:bg-blue-900/10 [&_svg]:size-4")}>
              <CloseIcon />
            </Dialog.Close>
          </div>
          <ul className="flex flex-col gap-6 overflow-y-auto px-6 pt-2 pb-6">
            {groups.map((group) => (
              <li key={group.domain} className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-4 border-t border-border-tertiary pt-6 first:border-t-0 first:pt-0">
                <span className="grid size-12 place-items-center rounded-full border border-border-tertiary bg-background-primary shadow-elevation-1">
                  <span className="size-9">
                    <EntityIcon domain={group.agency.icon} short={group.agency.short} />
                  </span>
                </span>
                <div className="flex min-w-0 flex-col gap-3">
                  <div>
                    <p className="type-body-m font-medium">{group.agency.name}</p>
                    <p className="type-body-m text-text-secondary">{group.domain}</p>
                  </div>
                  {group.entries.map((entry) => (
                    <a
                      key={entry.url}
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "w-fit rounded-4 type-body-m text-pretty text-link underline decoration-dotted decoration-1 underline-offset-[3px] transition-colors hover:text-blue-700",
                        focusRing,
                      )}
                    >
                      {cleanTitle(entry.title) || hostOf(entry.url)}
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Unverified() {
  return (
    <p role="note" className="animate-message-action-in mt-4 flex items-start gap-2 rounded-16 bg-[#fff6e5] px-4 py-3 type-body-s text-[#6b4a00]">
      <span aria-hidden className="mt-0.5">⚠︎</span>
      {site.ui.unverified}
    </p>
  );
}
