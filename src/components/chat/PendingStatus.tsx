import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useReducedMotion } from "../../lib/hooks";
import { site } from "@country/site";
import EntityIcon from "./EntityIcon";
import { agencyFor } from "./sources";

export type PendingStage = "thinking" | "searching" | "reviewing";

const phrases = site.pending;

const rotateMs = 2400;
const longerAfterMs = 10_000;
const outQuint = [0.22, 1, 0.36, 1] as const;

function useRotatingPhrase(set: readonly string[]) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    const timer = setInterval(() => setIndex((value) => (value + 1) % set.length), rotateMs);
    return () => clearInterval(timer);
  }, [set]);
  return set[index % set.length];
}

function SealStack({ urls }: { urls: string[] }) {
  const agencies = [...new Map(urls.map((url) => agencyFor(url)).map((agency) => [agency.domain, agency])).values()].slice(0, 3);
  return (
    <div className="relative flex items-center">
      <AnimatePresence mode="popLayout">
        {agencies.map((agency, index) => (
          <motion.span
            key={agency.domain}
            className="grid size-6 place-items-center overflow-hidden rounded-full border border-border-tertiary bg-background-primary shadow-elevation-1 not-first:-ms-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18, delay: index * 0.16, ease: [0.16, 1, 0.3, 1] } }}
            transition={{ duration: 0.24, delay: index * 0.16, ease: outQuint }}
          >
            <span className="size-[18px]">
              <EntityIcon domain={agency.icon} short={agency.short} />
            </span>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function PendingStatus({ stage, sources }: { stage: PendingStage; sources: string[] }) {
  const reduced = useReducedMotion();
  const [longer, setLonger] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLonger(true), longerAfterMs);
    return () => clearTimeout(timer);
  }, []);
  const label = useRotatingPhrase(phrases[longer ? "longer" : stage]);
  const offset = reduced ? 0 : 6;

  return (
    <div data-slot="message" data-align="start" className="flex w-full min-w-0 type-body-m">
      <LayoutGroup>
        <div className="relative flex items-center gap-2">
          {sources.length > 0 && <SealStack urls={sources} />}
          <motion.div layout="position" transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.6 }} className="relative min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={label}
                initial={{ opacity: 0, y: offset }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -offset, transition: { duration: 0.16, ease: outQuint } }}
                transition={{ duration: 0.24, ease: outQuint }}
              >
                <span className="text-shimmer type-body-m font-normal" aria-live="off">
                  {label}
                </span>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </LayoutGroup>
    </div>
  );
}
