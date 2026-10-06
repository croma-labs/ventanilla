import { site } from "@country/site";
import { cn } from "../../lib/cn";
import { focusRing } from "../../lib/ui";
import { GitHubIcon } from "../icons";

export default function RepoBadge({ className }: { className?: string }) {
  const repo = site.meta.repo;
  if (!repo) return null;
  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={repo.label}
      title={repo.label}
      className={cn("inline-flex items-center gap-1.5 rounded-4 font-medium whitespace-nowrap text-primary/80 transition-colors duration-200 hover:text-primary", focusRing, className)}
    >
      <GitHubIcon size={14} className="shrink-0" />
      <span>GitHub</span>
    </a>
  );
}
