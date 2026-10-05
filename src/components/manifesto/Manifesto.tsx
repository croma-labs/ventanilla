import { site } from "@country/site";
import { animate, useMotionValue, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useIsMobile, useReducedMotion } from "../../lib/hooks";
import ArrowChip from "./ArrowChip";
import BadgesChip from "./BadgesChip";
import FingerprintChip from "./FingerprintChip";
import { countWords, RevealWords, type Reveal } from "./reveal";

const { flag: _, ...copy } = site.manifesto;

const progressSeconds = 1.8;
const tailSeconds = 0.9;
const outQuint = [0.22, 1, 0.36, 1] as const;

const sentence = Object.values(copy).join(" ").replace(/\s+/g, " ").trim();

const arrowAt = countWords(copy.lead);
const sourcesFrom = arrowAt + 1;
const badgesAt = sourcesFrom + countWords(copy.beforeSources);
const privacyFrom = badgesAt + 1;
const fingerprintAt = privacyFrom + countWords(copy.beforePrivacy);
const tailFrom = fingerprintAt + 1;
const tokenCount = tailFrom + countWords(copy.afterPrivacy);

export default function Manifesto() {
  const target = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const mobile = useIsMobile();
  const [revealed, setRevealed] = useState(false);
  const progress = useMotionValue(0);
  const tail = useMotionValue(0);
  const settled = useMotionValue(1);
  const { scrollYProgress } = useScroll({ target, offset: [mobile ? "start 95%" : "start 80%", "end 20%"] });

  useMotionValueEvent(scrollYProgress, "change", (value) => setRevealed(value > 0));
  useEffect(() => setRevealed(scrollYProgress.get() > 0), [scrollYProgress]);

  useEffect(() => {
    if (reduced) return;
    const goal = Number(revealed);
    const duration = Math.abs(goal - progress.get()) * progressSeconds;
    const animations = [
      animate(progress, goal, { duration, ease: outQuint }),
      animate(tail, goal, { duration: Math.abs(goal - tail.get()) * tailSeconds, ease: outQuint, delay: revealed ? duration : 0 }),
    ];
    return () => animations.forEach((animation) => animation.stop());
  }, [revealed, reduced, progress, tail]);

  const reveal: Reveal = { progress: reduced ? settled : progress, tail: reduced ? settled : tail, count: tokenCount };

  return (
    <section id="about" className="site-container site-grid @container py-24 mobile:py-64">
      <div ref={target} lang={site.lang} className="home-manifesto col-span-full justify-self-center text-center type-site-1 text-text-primary">
        <p className="sr-only">{sentence}</p>
        <RevealWords from={0} reveal={reveal} text={copy.lead} />{" "}
        <br aria-hidden className="mobile:hidden" />
        <ArrowChip at={arrowAt} reveal={reveal} />{" "}
        <RevealWords breakFirstLineOnMobile from={sourcesFrom} reveal={reveal} text={copy.beforeSources} />{" "}
        <BadgesChip at={badgesAt} reveal={reveal} />{" "}
        <RevealWords from={privacyFrom} reveal={reveal} text={copy.beforePrivacy} />{" "}
        <FingerprintChip at={fingerprintAt} reveal={reveal} />{" "}
        <RevealWords from={tailFrom} reveal={reveal} text={copy.afterPrivacy} />
      </div>
    </section>
  );
}
