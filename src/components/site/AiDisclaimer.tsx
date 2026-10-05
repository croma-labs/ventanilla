import { useState } from "react";
import { cn } from "../../lib/cn";
import { focusRing } from "../../lib/ui";
import { site } from "@country/site";
import { ClockIcon, InfoIcon, LockOutlineIcon, ShieldIcon } from "../icons";
import FactsSheet, { type Fact } from "./FactsSheet";

const privacyIcons = [ShieldIcon, LockOutlineIcon, ClockIcon];
const privacyFacts: Fact[] = site.disclaimers.privacy.items.map((item, index) => ({ ...item, icon: privacyIcons[index % privacyIcons.length] }));
const howItWorksFacts: Fact[] = site.disclaimers.ai.items.map((item) => ({ ...item }));

type Notice = "privacy" | "mistakes" | null;

const triggerClass = cn(
  "cursor-pointer rounded-8 py-1.5 underline decoration-dotted decoration-1 underline-offset-2 [text-decoration-skip-ink:none] transition-colors duration-200 group-hover/notice:text-primary",
  focusRing,
);
const iconClass = "shrink-0 transition-colors duration-200 group-hover/notice:text-primary";

export default function AiDisclaimer({ placeholder }: { placeholder: boolean }) {
  const [notice, setNotice] = useState<Notice>(null);
  const toggle = (kind: Exclude<Notice, null>) => (open: boolean) => setNotice(open ? kind : null);

  return (
    <p
      data-slot="ai-disclaimer"
      data-notice-open={notice ? "" : undefined}
      data-placeholder={placeholder ? "" : undefined}
      aria-hidden={placeholder || undefined}
      inert={placeholder}
      className={cn(
        "relative mb-3 flex items-center justify-center text-center type-body-s leading-normal text-secondary",
        "transition-[opacity,translate,visibility] delay-240 duration-200 ease-out-quint motion-reduce:transition-none",
        "data-placeholder:invisible data-placeholder:translate-y-1.5 data-placeholder:opacity-0 data-placeholder:delay-0 motion-reduce:translate-y-0",
      )}
    >
      <span className="flex items-center justify-center gap-1">
        <span className="group/notice inline-flex items-center gap-1.5">
          <LockOutlineIcon size={14} className={iconClass} />
          <FactsSheet
            title={site.disclaimers.privacy.title}
            facts={privacyFacts}
            open={notice === "privacy"}
            onOpenChange={toggle("privacy")}
            trigger={<button type="button" className={triggerClass}>{site.disclaimers.privacy.title}</button>}
          />
        </span>
        <span aria-hidden>·</span>
        <span className="group/notice inline-flex items-center gap-1.5">
          <InfoIcon size={14} className={iconClass} />
          <FactsSheet
            title={site.disclaimers.ai.title}
            facts={howItWorksFacts}
            open={notice === "mistakes"}
            onOpenChange={toggle("mistakes")}
            trigger={<button type="button" className={triggerClass}>{site.disclaimers.ai.title}</button>}
          />
        </span>
      </span>
    </p>
  );
}
