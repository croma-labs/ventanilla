import { Dialog } from "@base-ui/react/dialog";
import { Fragment, type ComponentType, type ReactElement } from "react";
import { cn } from "../../lib/cn";
import { buttonBase } from "../../lib/ui";
import { CloseIcon } from "../icons";

export type Fact = { icon?: ComponentType<{ size?: number }>; heading?: string; body: string };

type FactsSheetProps = {
  title: string;
  facts: Fact[];
  trigger: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  bodyClassName?: string;
};

const closeButton = cn(buttonBase, "size-11 rounded-full bg-blue-900/5 text-primary backdrop-blur-[25px] hover:bg-blue-900/10 [&_svg]:size-4");

export default function FactsSheet({ title, facts, trigger, open, onOpenChange, bodyClassName }: FactsSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-(--z-index-modal) bg-background-overlay backdrop-blur-[12px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed z-(--z-index-modal) flex flex-col overflow-hidden bg-background-primary text-text-primary ring-1 ring-border-quaternary outline-none",
            "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-40 transition-transform duration-500 ease-drawer data-ending-style:translate-y-full data-starting-style:translate-y-full",
            "mobile:inset-auto mobile:top-1/2 mobile:left-1/2 mobile:max-h-[min(calc(100vh-112px),680px)] mobile:w-[432px] mobile:max-w-[calc(100vw-32px)] mobile:-translate-1/2 mobile:rounded-40",
            "mobile:transition-[opacity,scale] mobile:duration-200 mobile:ease-out mobile:data-ending-style:translate-y-[-50%] mobile:data-ending-style:scale-[0.97] mobile:data-ending-style:opacity-0 mobile:data-starting-style:translate-y-[-50%] mobile:data-starting-style:scale-[0.97] mobile:data-starting-style:opacity-0",
          )}
        >
          <div className="flex w-full shrink-0 items-center gap-3 p-4">
            <span aria-hidden className="invisible size-11" />
            <Dialog.Title className="flex-1 type-label-m text-center font-medium text-primary">{title}</Dialog.Title>
            <Dialog.Close aria-label="Close" className={closeButton}>
              <CloseIcon />
            </Dialog.Close>
          </div>
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 pt-4 pb-10 mobile:px-10 md:pt-2">
            {facts.map(({ icon: Icon, heading, body }, index) => (
              <Fragment key={body}>
                {index > 0 && <div aria-hidden className="h-px w-full shrink-0 bg-border-tertiary" />}
                <div className="flex flex-col">
                  {(Icon || heading) && (
                    <div className="flex flex-col items-start gap-2">
                      {Icon && (
                        <span className="flex shrink-0 items-center text-primary">
                          <Icon size={24} />
                        </span>
                      )}
                      {heading && <h3 className="type-body-m text-primary">{heading}</h3>}
                    </div>
                  )}
                  <p className={cn("type-body-m text-secondary", bodyClassName)}>{body}</p>
                </div>
              </Fragment>
            ))}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
