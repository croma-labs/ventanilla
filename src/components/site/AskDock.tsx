import { site } from "@country/site";
import { useEffect, useRef, useState } from "react";
import { useChatPhase, useTextAppearing } from "../../lib/chat-store";
import Composer from "../hero/Composer";
import AiDisclaimer from "./AiDisclaimer";

const showBelow = -240;
const hideAbove = -160;

export default function AskDock() {
  const [aside, setAside] = useState(true);
  const conversing = useChatPhase() === "chat";
  const appearing = useTextAppearing();
  const [atEnd, setAtEnd] = useState(true);

  useEffect(() => {
    const sync = () => setAtEnd(scrollY + innerHeight >= document.documentElement.scrollHeight - 32);
    sync();
    addEventListener("scroll", sync, { passive: true });
    addEventListener("resize", sync);
    const observer = new ResizeObserver(sync);
    observer.observe(document.body);
    return () => {
      removeEventListener("scroll", sync);
      removeEventListener("resize", sync);
      observer.disconnect();
    };
  }, []);
  const dock = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>('[data-slot="hero-ask-pill"]');
    if (!hero) return setAside(false);
    const sync = () => {
      const bottom = hero.getBoundingClientRect().bottom;
      setAside((current) => (current ? bottom > showBelow : bottom >= hideAbove));
    };
    sync();
    addEventListener("scroll", sync, { passive: true });
    addEventListener("resize", sync);
    return () => {
      removeEventListener("scroll", sync);
      removeEventListener("resize", sync);
    };
  }, []);

  useEffect(() => {
    const focus = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest("[data-ask-focus]")) return;
      setAside(false);
      requestAnimationFrame(() => dock.current?.querySelector("textarea")?.focus());
    };
    document.addEventListener("click", focus);
    return () => document.removeEventListener("click", focus);
  }, []);

  return (
    <div
      ref={dock}
      data-slot="ask-dock"
      data-dock-aside={aside && !conversing ? "" : undefined}
      data-ask-mode={conversing ? "conversation" : undefined}
      className="pointer-events-none fixed bottom-0 left-1/2 z-(--z-index-dock) flex w-0 justify-center pt-10 pb-[calc(20px+env(safe-area-inset-bottom))] md:pb-8"
    >
      <div
        data-slot="ask-pill"
        className="pointer-events-auto relative w-[calc(100vw-2rem)] max-w-[676px] shrink-0 transition-[max-width] duration-250 ease-drawer focus-within:max-w-[684px] hover:max-w-[684px] has-[[data-slot=ai-disclaimer][data-notice-open]]:max-w-[684px]"
      >
        <AiDisclaimer placeholder={!(conversing && atEnd && !appearing)} />
        <Composer variant="dock" placeholder={site.ui.askAnything} />
      </div>
    </div>
  );
}
