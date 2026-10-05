import { site } from "@country/site";
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, MotionConfig, motion, stagger, type Variants } from "motion/react";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "../../lib/cn";
import { buttonBase, focusRing } from "../../lib/ui";
import { CloseIcon } from "../icons";

const links = [{ label: "Inicio", href: "/" }, ...site.nav.primary];

const smootherstep = (t: number) => 10 * t ** 2 - 20 * t ** 3 + 15 * t ** 4 - 4 * t ** 5;
const overshoot = (t: number) => smootherstep(t) + 0.65 * t ** 3 * (1 - t) ** 2;
const standard = [0.25, 0.1, 0.25, 1] as const;

const fill = "#002664";

const backdrop: Variants = {
  closed: { opacity: 0 },
  open: { opacity: 1, transition: { duration: 0.35, ease: standard } },
  exit: { opacity: 0, transition: { duration: 0.26, ease: standard } },
};

const panel: Variants = {
  open: { transition: { delayChildren: stagger(0.035, { startDelay: 0.14 }) } },
  exit: { pointerEvents: "none" },
};

const item: Variants = {
  closed: { opacity: 0, x: 12 },
  open: { opacity: 1, x: 0, transition: { duration: 0.48, ease: [0.22, 0, 0.2, 1] } },
  exit: { opacity: 0, transition: { duration: 0.08 } },
};

const fade: Variants = {
  closed: { opacity: 0 },
  open: { opacity: 1, transition: { duration: 0.48, ease: [0.22, 0, 0.2, 1] } },
  exit: { opacity: 0, transition: { duration: 0.08 } },
};

export default function MenuSheet({ pathname = "/" }: { pathname?: string }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<CSSProperties>({});
  const trigger = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const desktop = innerWidth >= 768;
      const inset = desktop ? 40 : 24;
      const centerY = rect.top + rect.height / 2;
      const panelRight = desktop ? innerWidth - 33 : innerWidth - 16;
      const closeCenterX = panelRight - inset - 22;
      setPlacement({
        "--menu-panel-top": `${Math.max(16, centerY - inset - 22)}px`,
        "--menu-close-offset": `${closeCenterX - (rect.left + rect.width / 2)}px`,
      } as CSSProperties);
    };
    place();
    addEventListener("resize", place);
    return () => removeEventListener("resize", place);
  }, [open]);

  return (
    <MotionConfig reducedMotion="user">
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <div className="site-menu-trigger relative justify-self-end">
          {!open && (
            <motion.div
              aria-hidden
              layoutId="menu-surface"
              transition={{ layout: { duration: 0.26, ease: smootherstep } }}
              className="pointer-events-none absolute inset-0"
              style={{ backgroundColor: fill, borderRadius: 22 }}
            />
          )}
          <Dialog.Trigger
            ref={trigger}
            render={
              <motion.button
                animate={{ opacity: open ? 0 : 1 }}
                transition={open ? { duration: 0 } : { delay: 0.1, duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
              />
            }
            className={cn(
              buttonBase,
              "type-label-m relative h-11 px-5 pb-0.5 font-medium tracking-[-0.03em] text-white backdrop-blur-frost hover:bg-blue-800",
            )}
          >
            {site.ui.menu}
          </Dialog.Trigger>
        </div>

        <AnimatePresence>
          {open && (
            <Dialog.Portal keepMounted>
              <Dialog.Backdrop
                render={<motion.div variants={backdrop} initial="closed" animate="open" exit="exit" />}
                className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
              />
              <Dialog.Popup
                render={<motion.div variants={panel} initial="closed" animate="open" exit="exit" />}
                style={placement}
                className="fixed top-(--menu-panel-top,1rem) right-4 left-4 z-50 flex max-h-[calc(100dvh-var(--menu-panel-top,1rem)-1rem)] flex-col text-blue-900 outline-none mobile:right-[33px] mobile:left-auto mobile:w-[min(435px,calc(100%-66px))]"
              >
                <motion.div
                  aria-hidden
                  layoutId="menu-surface"
                  transition={{ layout: { duration: 0.52, ease: overshoot } }}
                  initial={{ backgroundColor: fill }}
                  animate={{ backgroundColor: "#ffffff", transition: { duration: 0.24, ease: standard } }}
                  exit={{ backgroundColor: fill, transition: { delay: 0.1, duration: 0.16 } }}
                  className="pointer-events-none absolute inset-0 border border-grey-100 shadow-[2px_11px_24px_#0000001a,8px_42px_43px_#00000017,18px_95px_58px_#0000000d]"
                  style={{ borderRadius: 40 }}
                />
                <div className="relative flex max-h-[inherit] flex-col gap-11 overflow-y-auto overscroll-contain rounded-40 p-6 mobile:p-10">
                  <Dialog.Title className="sr-only">{site.ui.menu}</Dialog.Title>
                  <motion.div variants={fade} className="flex shrink-0 justify-end">
                    <Dialog.Close
                      aria-label={site.ui.closeMenu}
                      className={cn(
                        buttonBase,
                        "mr-(--menu-close-offset,0px) size-11 rounded-full bg-blue-900/5 text-inherit backdrop-blur-[25px] hover:bg-blue-900/10 [&_svg]:size-4",
                      )}
                    >
                      <CloseIcon />
                    </Dialog.Close>
                  </motion.div>
                  <div className="flex shrink-0 flex-col gap-14">
                    <nav aria-label={site.ui.menu}>
                      <ul className="flex flex-col items-center gap-1">
                        {links.map((link) => (
                          <motion.li key={link.href} variants={item}>
                            <a
                              href={link.href}
                              aria-current={link.href === pathname ? "page" : undefined}
                              onClick={() => setOpen(false)}
                              className={cn(
                                "block rounded-8 text-center font-sans-display text-[2rem] leading-10 font-normal tracking-[-0.028125em] text-inherit [text-underline-position:from-font] hover:underline focus-visible:underline",
                                focusRing,
                                link.href === pathname && "underline",
                              )}
                            >
                              {link.label}
                            </a>
                          </motion.li>
                        ))}
                      </ul>
                    </nav>
                    <motion.div
                      variants={fade}
                      className="flex flex-col items-center gap-2 rounded-12 bg-[#fafafa] pt-4 pr-8 pb-6 pl-6 text-blue-900/65 ring-1 ring-blue-900/3 ring-inset mobile:rounded-16"
                    >
                      <span aria-hidden className="flex h-3.5 w-6 flex-col overflow-hidden rounded-[2px]">
                        {site.manifesto.flag.map((color, index) => (
                          <span key={index} className="flex-1" style={{ backgroundColor: color }} />
                        ))}
                      </span>
                      <p className="w-[220px] max-w-full text-center font-sans text-sm leading-[19px]">{site.brand.notice}</p>
                    </motion.div>
                  </div>
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </MotionConfig>
  );
}
