export const focusRing =
  "focus-visible:shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--color-black-100)] focus-visible:outline-none";

export const buttonBase = `inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-medium transition-[color,background-color,border-color,box-shadow,scale,opacity] duration-200 ease-out-quint active:scale-(--scale-press) disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 rounded-40 ${focusRing}`;

export const buttonPrimary = "bg-blue-700 text-white shadow-elevation-1 hover:bg-blue-800 active:bg-blue-700";

export const buttonGhost =
  "bg-transparent text-text-primary hover:bg-background-tertiary focus-visible:bg-background-tertiary active:text-text-disabled";

export const buttonSecondary = "bg-background-tertiary text-text-primary hover:bg-background-secondary";

export const buttonElevated =
  "border border-border-tertiary bg-background-primary text-text-primary shadow-elevation-1 hover:border-border-primary";

export const glassControl =
  "size-14 rounded-full border border-blue-900/2 bg-[#f3f3f3] text-text-primary shadow-control backdrop-blur-frost hover:bg-grey-200 active:scale-95 active:bg-grey-100 [&_svg]:size-5";
