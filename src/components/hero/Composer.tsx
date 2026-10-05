import { site } from "@country/site";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { snapshotOrigin, submitQuestion, useChatBusy } from "../../lib/chat-store";
import { cn } from "../../lib/cn";
import { findSensitive } from "../../lib/pii";
import { buttonBase } from "../../lib/ui";
import { ArrowRightIcon } from "../icons";

type Variant = "hero" | "dock";

type ComposerProps = {
  variant: Variant;
  placeholder?: string;
  fallback?: string;
  preview?: ReactNode;
  autoFocus?: boolean;
  onInteract?: () => void;
};

const shell: Record<Variant, string> = {
  hero: "min-h-14 rounded-32 py-2.5 pr-3 pl-6 shadow-composer-sm outline-2 outline-ring max-md:p-3 mobile:min-h-0 mobile:rounded-[48px] mobile:py-[23px] mobile:pr-[23px] mobile:pl-10 mobile:shadow-none",
  dock: "min-h-14 rounded-32 py-2.5 pr-3 pl-6 shadow-composer-sm outline-1 outline-border-secondary focus-within:outline-2 focus-within:outline-ring sm:shadow-elevation-1 mobile:rounded-[48px] mobile:py-[22px] mobile:pr-6 mobile:pl-8",
};

const actionSize: Record<Variant, string> = {
  hero: "size-10 min-w-10 mobile:size-12 mobile:min-w-12",
  dock: "size-9 min-w-9",
};

const StopIcon = () => (
  <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M16 14V6C16 4.9 15.1 4 14 4H6C4.9 4 4 4.9 4 6V14C4 15.1 4.9 16 6 16H14C15.1 16 16 15.1 16 14Z" fill="currentColor" />
  </svg>
);

export default function Composer({ variant, placeholder = "", fallback, preview, autoFocus, onInteract }: ComposerProps) {
  const [value, setValue] = useState("");
  const busy = useChatBusy();
  const form = useRef<HTMLFormElement>(null);
  const [attempted, setAttempted] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const sensitive = useMemo(() => [...new Set(findSensitive(value, site.pii).map((span) => span.label.toLowerCase()))], [value]);
  const blocked = sensitive.length > 0;

  useEffect(() => {
    if (!autoFocus || !matchMedia("(pointer: fine)").matches) return;
    textarea.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    const style = getComputedStyle(element);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
    const max = lineHeight * 3 + 16;
    element.style.height = `${Math.min(element.scrollHeight, max)}px`;
    element.style.overflowY = element.scrollHeight > max + 1 ? "auto" : "hidden";
  }, [value]);

  const submit = (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    if (busy && variant === "dock") return dispatchEvent(new Event("ventanilla:stop"));
    if (blocked) return setAttempted(true);
    const text = value.trim() || fallback;
    if (!text) return;
    submitQuestion(text, snapshotOrigin(form.current));
    if (matchMedia("(hover: none), (pointer: coarse)").matches) (document.activeElement as HTMLElement | null)?.blur();
    setAttempted(false);
    setValue("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) submit(event);
  };

  return (
    <div data-slot={variant === "hero" ? "hero-ask-pill" : "ask-pill"} className="w-full">
      <form
        ref={form}
        data-slot="chat-input-shell"
        aria-label={site.ui.describe}
        onSubmit={submit}
        onPointerDownCapture={onInteract}
        onKeyDownCapture={onInteract}
        onClick={(event) => !(event.target as HTMLElement).closest("button, a") && textarea.current?.focus()}
        className={cn(
          "group relative z-10 flex w-full cursor-text flex-col items-stretch overflow-clip border border-transparent bg-background-primary transition-[outline-color] duration-700 ease-out-quint",
          shell[variant],
        )}
      >
        <div className="relative z-10 flex min-h-9 w-full items-end gap-1 max-md:flex-col">
          <div
            className={cn(
              "relative flex min-w-0 flex-1 self-center text-(length:--text-body-m) max-md:w-full max-md:items-center",
              variant === "hero" && "mobile:text-[1.3125rem]",
            )}
          >
            <div className="peer relative flex min-w-0 flex-1">
              <textarea
                ref={textarea}
                rows={1}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder={preview ? " " : placeholder}
                aria-label={variant === "hero" ? site.ui.describe : site.ui.ask}
                aria-invalid={blocked || undefined}
                aria-describedby={blocked ? `${variant}-pii` : undefined}
                className="type-body-m -my-2 min-w-0 flex-1 resize-none overscroll-contain bg-transparent py-2 leading-normal text-primary outline-none placeholder:text-secondary"
                style={{ fontSize: "inherit" }}
              />
            </div>
            {preview && (
              <span
                aria-hidden
                data-slot="chat-input-placeholder"
                className="type-body-m pointer-events-none absolute inset-x-0 -inset-y-2 flex items-center overflow-hidden leading-normal whitespace-nowrap text-secondary [font-size:inherit] peer-has-[textarea:not(:placeholder-shown)]:hidden"
              >
                {preview}
              </span>
            )}
          </div>
          <div className="flex min-h-9 shrink-0 items-center gap-1 max-md:self-end">
            <motion.button
              type="submit"
              aria-label={busy && variant === "dock" ? site.ui.stop : site.ui.send}
              aria-disabled={blocked || undefined}
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className={cn(
                buttonBase,
                "rounded-full bg-blue-700 p-0 text-white shadow-[0px_10px_40px_0px_rgba(0,0,0,0.08)] transition-[background-color,color,box-shadow] duration-200 ease-standard hover:bg-blue-800 active:scale-100",
                actionSize[variant],
              )}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={busy && variant === "dock" ? "stop" : "send"}
                  className="flex items-center justify-center"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {busy && variant === "dock" ? <StopIcon /> : <ArrowRightIcon />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </form>
      <AnimatePresence>
        {blocked && (attempted || variant === "dock") && (
          <motion.p
            id={`${variant}-pii`}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="relative z-10 mx-6 mt-3 rounded-16 bg-background-primary px-4 py-2.5 type-body-s text-text-primary shadow-elevation-1"
          >
            {site.ui.piiBlocked.replace("{labels}", sensitive.join(", "))}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
