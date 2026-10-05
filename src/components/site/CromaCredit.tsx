import { site } from "@country/site";
import croma from "../../assets/svg/croma.svg?raw";
import { cn } from "../../lib/cn";
import { focusRing } from "../../lib/ui";

const symbol = croma.replace("<svg ", '<svg aria-hidden="true" class="h-[1.05em] w-auto" ');

export default function CromaCredit({ className }: { className?: string }) {
  return (
    <a
      href="https://usecroma.com"
      target="_blank"
      rel="noopener noreferrer"
      className={cn("group/croma inline-flex items-center gap-1.5 rounded-4 whitespace-nowrap transition-colors duration-200 hover:text-primary", focusRing, className)}
    >
      <span>{site.brand.poweredBy}</span>
      <span className="inline-flex items-center gap-1 font-medium text-primary/80 transition-colors group-hover/croma:text-primary">
        <span className="inline-flex" dangerouslySetInnerHTML={{ __html: symbol }} />
        Croma
      </span>
    </a>
  );
}
