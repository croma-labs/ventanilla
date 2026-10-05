import { site } from "@country/site";
import { snapshotOrigin, submitQuestion } from "../../lib/chat-store";

export default function FollowUps({ suggestions, delayStart, disabled }: { suggestions: string[]; delayStart: number; disabled: boolean }) {
  return (
    <div data-slot="follow-up-suggestions" role="group" aria-label={site.ui.followUps} className="relative mt-3 max-w-full min-w-0">
      <div className="flex items-start gap-3 overflow-x-auto [scrollbar-width:none] mobile:flex-col mobile:overflow-visible">
        {suggestions.map((suggestion, index) => (
          <div
            key={suggestion}
            className="animate-option-pill-in w-fit max-w-none shrink-0 whitespace-nowrap mobile:max-w-full mobile:whitespace-normal"
            style={{ animationDelay: `${delayStart + index * 80}ms` }}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={(event) => submitQuestion(suggestion, snapshotOrigin(event.currentTarget))}
              className="type-body-m flex h-auto min-h-14 w-fit max-w-full min-w-10 cursor-pointer items-center gap-3 overflow-hidden rounded-40 border border-border-tertiary bg-transparent px-5 pt-1.75 pb-2.25 text-left leading-normal font-normal wrap-anywhere text-secondary outline-none transition-[color,border-color,scale] duration-200 ease-out-quint select-none hover:border-border-secondary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-(--scale-press) disabled:cursor-not-allowed disabled:opacity-50 sm:leading-snug"
            >
              {suggestion}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
