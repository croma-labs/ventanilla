import { Popover } from "@base-ui/react/popover";
import { motion } from "motion/react";
import { useState, type ComponentType } from "react";
import { cn } from "../../lib/cn";
import { buttonBase, buttonSecondary } from "../../lib/ui";
import type { Grounding } from "../../lib/ui-stream";
import { CheckIcon, CloseIcon } from "../icons";
import { SourcesChip } from "./SourceList";
import { site } from "@country/site";

const outQuint = [0.22, 1, 0.36, 1] as const;
const pill = "h-9 min-h-9 rounded-full type-label-s font-medium tracking-[0] text-secondary hover:text-primary aria-pressed:text-primary";
const underline = "underline decoration-dotted decoration-1 underline-offset-[3px] [text-decoration-skip-ink:none]";

const ThumbUp = () => (
  <svg aria-hidden viewBox="0 0 20 20" fill="currentColor">
    <path d="M5.2 7.9H3.6V15.1H5.2V7.9Z" />
    <path d="M10.8 5.5V8.7H14.8V8.73L14.78 8.76L13.56 13.5H8.4V8.46L10.77 5.5H10.8ZM10.8 3.9H10.77C10.28 3.9 9.82 4.12 9.52 4.5L7.15 7.46C6.93 7.74 6.8 8.1 6.8 8.46V13.5C6.8 14.38 7.51 15.1 8.4 15.1H13.56C14.29 15.1 14.93 14.6 15.11 13.9L16.33 9.16C16.65 8.14 15.87 7.11 14.8 7.11H12.4V5.51C12.4 4.63 11.68 3.91 10.8 3.91V3.9Z" />
  </svg>
);

const ThumbDown = () => (
  <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="rotate-180">
    <path d="M5.2 7.9H3.6V15.1H5.2V7.9Z" />
    <path d="M10.8 5.5V8.7H14.8V8.73L14.78 8.76L13.56 13.5H8.4V8.46L10.77 5.5H10.8ZM10.8 3.9H10.77C10.28 3.9 9.82 4.12 9.52 4.5L7.15 7.46C6.93 7.74 6.8 8.1 6.8 8.46V13.5C6.8 14.38 7.51 15.1 8.4 15.1H13.56C14.29 15.1 14.93 14.6 15.11 13.9L16.33 9.16C16.65 8.14 15.87 7.11 14.8 7.11H12.4V5.51C12.4 4.63 11.68 3.91 10.8 3.91V3.9Z" />
  </svg>
);

const CopyIcon = () => (
  <svg aria-hidden viewBox="0 0 20 20" fill="currentColor">
    <path d="M13 1H5C3.9 1 3 1.9 3 3V13H5V3H13V1ZM15 5H9C7.9 5 7 5.9 7 7V17C7 18.1 7.9 19 9 19H15C16.1 19 17 18.1 17 17V7C17 5.9 16.1 5 15 5ZM15 17H9V7H15V17Z" />
  </svg>
);

const Spinner = () => (
  <svg aria-hidden viewBox="0 0 20 20" fill="none" className="motion-safe:animate-spin">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
    <path d="M17 10a7 7 0 0 0-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

type Rating = "up" | "down";

function RatingButtons() {
  const [rating, setRating] = useState<Rating | null>(null);
  const [sending, setSending] = useState(false);
  const [thanked, setThanked] = useState<Rating | null>(null);

  const rate = (value: Rating) => {
    if (sending) return;
    if (rating === value) {
      setRating(null);
      setThanked(null);
      return;
    }
    setRating(value);
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setThanked(value);
    }, 700);
  };

  const thumb = (value: Rating, label: string, Icon: ComponentType) => (
    <Popover.Root open={thanked === value} onOpenChange={(open) => !open && setThanked(null)}>
      <Popover.Trigger
        render={<button type="button" />}
        aria-label={rating === value ? site.ui.unrate : label}
        aria-pressed={rating === value}
        aria-busy={sending && rating === value}
        aria-disabled={sending && rating !== value ? true : undefined}
        data-selected={rating === value}
        onClick={(event) => {
          event.preventDefault();
          rate(value);
        }}
        className={cn(
          buttonBase,
          pill,
          "relative size-8 min-h-8 bg-transparent p-0 [--scale-press:0.95] data-[selected=true]:bg-blue-500 data-[selected=true]:text-primary-invert",
        )}
      >
        <span className="relative flex size-5 items-center justify-center [&_svg]:size-5">{sending && rating === value ? <Spinner /> : <Icon />}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="center" sideOffset={10} collisionPadding={16} className="z-50">
          <Popover.Popup className="relative flex w-[356px] max-w-[calc(100vw-2rem)] origin-(--transform-origin) flex-col gap-4 rounded-32 bg-background-primary p-4 shadow-elevation-1 ring-1 ring-border-tertiary data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-ending-style:transition-[opacity,scale] data-ending-style:duration-100 data-open:animate-[feedback-popover-in_0.18s_var(--ease-out-quint)_both]">
            <Popover.Close aria-label={site.ui.close} className={cn(buttonBase, "absolute top-3 right-3 size-8 rounded-full hover:bg-background-tertiary [&_svg]:size-4")}>
              <CloseIcon />
            </Popover.Close>
            <div className="flex flex-col gap-1 pr-10 pl-2 pt-2">
              <Popover.Title className="type-body-m font-medium">{site.ui.thanks}</Popover.Title>
              <Popover.Description className="type-body-m text-text-secondary">{site.ui.thanksBody}</Popover.Description>
            </div>
            <button type="button" className={cn(buttonBase, buttonSecondary, "h-11 w-full rounded-full px-5 type-body-m")} onClick={() => setThanked(null)}>
              {site.ui.close}
            </button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );

  return (
    <div className="flex items-center rounded-full bg-background-tertiary p-0.5">
      {thumb("up", site.ui.good, ThumbUp)}
      {thumb("down", site.ui.bad, ThumbDown)}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const layer = "absolute inset-0 flex items-center justify-center transition-[opacity,filter,scale] duration-300 ease-in-out [&_svg]:size-5";
  return (
    <button
      type="button"
      aria-label={copied ? site.ui.copied : site.ui.copy}
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className={cn(buttonBase, buttonSecondary, "relative size-9 rounded-full p-0 text-secondary hover:text-primary [--scale-press:0.95]")}
    >
      <span className={cn(layer, copied && "scale-25 opacity-0 blur-xs")}>
        <CopyIcon />
      </span>
      <span className={cn(layer, !copied && "scale-25 opacity-0 blur-xs")}>
        <CheckIcon />
      </span>
    </button>
  );
}

export default function MessageActions({ groundings, text }: { groundings: Grounding[]; text: string }) {
  const groups = [groundings.length > 0 && <SourcesChip groundings={groundings} />, <RatingButtons />, <CopyButton text={text} />].filter(Boolean);
  return (
    <div className="relative -ml-1 w-full max-w-full min-w-0">
      <div role="group" aria-label={site.ui.actions} className="mt-3 flex w-full items-center gap-2 overflow-x-auto p-1 [scrollbar-width:none] *:shrink-0">
        {groups.map((group, index) => (
          <div key={index} className="animate-message-action-in flex" style={{ animationDelay: `${index * 80}ms` }}>
            {group}
          </div>
        ))}
      </div>
    </div>
  );
}

export const actionGroupCount = (groundings: Grounding[]) => (groundings.length > 0 ? 3 : 2);
