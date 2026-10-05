import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const icon = (paths: readonly string[], viewBox = "0 0 20 20", defaultSize = 20) =>
  function Icon({ size = defaultSize, ...props }: IconProps) {
    return (
      <svg aria-hidden fill="none" height={size} viewBox={viewBox} width={size} {...props}>
        {paths.map((d) => (
          <path d={d} fill="currentColor" fillRule="evenodd" clipRule="evenodd" key={d} />
        ))}
      </svg>
    );
  };

export const ArrowRightIcon = icon(["M10 3L8.59 4.41L13.17 9H3V11H13.17L8.59 15.59L10 17L17 10L10 3Z"]);
export const ChevronLeftIcon = icon(["M7.77 10L13.06 4.71L11.65 3.29L4.94 10L11.65 16.71L13.06 15.29L7.77 10Z"]);
export const ChevronRightIcon = icon(["M8.35 3.29L15.06 10L8.35 16.71L6.94 15.29L12.23 10L6.94 4.71L8.35 3.29Z"]);
export const PlayIcon = icon(["M6 3L18 10L6 17L6 3Z"], undefined, 16);
export const PauseIcon = icon(
  [
    "M8 4C8 3.45 7.55 3 7 3H5C4.45 3 4 3.45 4 4V16C4 16.55 4.45 17 5 17H7C7.55 17 8 16.55 8 16V4Z",
    "M16 4C16 3.45 15.55 3 15 3H13C12.45 3 12 3.45 12 4V16C12 16.55 12.45 17 13 17H15C15.55 17 16 16.55 16 16V4Z",
  ],
  undefined,
  16,
);
export const InfoIcon = icon(
  [
    "M11 15H9V9H11V15Z",
    "M11.2 6.2C11.2 6.86 10.9 7.4 10 7.4C9.1 7.4 8.8 6.86 8.8 6.2C8.8 5.54 9.1 5 10 5C10.9 5 11.2 5.54 11.2 6.2Z",
    "M10 1C5 1 1 5 1 10C1 15 5 19 10 19C15 19 19 15 19 10C19 5 15 1 10 1ZM10 3C13.9 3 17 6.1 17 10C17 13.9 13.9 17 10 17C6.1 17 3 13.9 3 10C3 6.1 6.1 3 10 3Z",
  ],
  undefined,
  16,
);
export const CheckIcon = icon(["M18 5.4L16.6 4L7.9 13.2L3.4 9L2 10.4L8 16L18 5.4Z"]);
export const CloseIcon = icon(["M15.66 5.76 14.24 4.34 10 8.59 5.76 4.34 4.34 5.76 8.59 10l-4.25 4.24 1.42 1.42L10 11.41l4.24 4.25 1.42-1.42L11.41 10l4.25-4.24Z"]);
export const ShieldIcon = icon(
  ["M19.2 2.40015H4.81204C4.15204 2.40015 3.60004 2.94015 3.60004 3.60015V10.8001C3.60004 16.8961 9.61204 20.4121 11.46 21.3481C11.628 21.4321 11.808 21.4801 11.988 21.4801C12.168 21.4801 12.348 21.4321 12.516 21.3481C14.364 20.4121 20.388 16.8961 20.388 10.8001V3.60015C20.388 2.94015 19.848 2.40015 19.188 2.40015H19.2ZM18 10.8001C18 15.0481 13.932 17.8321 12 18.9121V4.80015H18V10.8001Z"],
  "0 0 24 24",
  24,
);
export const ClockIcon = icon(
  [
    "M12 3.60007C16.68 3.60007 20.4 7.32007 20.4 12.0001C20.4 16.6801 16.68 20.4001 12 20.4001C7.32 20.4001 3.6 16.6801 3.6 12.0001C3.6 7.32007 7.32 3.60007 12 3.60007ZM12 1.20007C6 1.20007 1.2 6.00007 1.2 12.0001C1.2 18.0001 6 22.8001 12 22.8001C18 22.8001 22.8 18.0001 22.8 12.0001C22.8 6.00007 18 1.20007 12 1.20007Z",
    "M10.8 13.1999H18V10.7999H13.2V5.99988H10.8V13.1999Z",
  ],
  "0 0 24 24",
  24,
);
export const LockOutlineIcon = icon(
  [
    "M18.0001 8.40007H16.8001V6.00007C16.8001 3.34807 14.6521 1.20007 12.0001 1.20007C9.3481 1.20007 7.2001 3.34807 7.2001 6.00007V8.40007H6.0001C4.6801 8.40007 3.6001 9.48007 3.6001 10.8001V20.4001C3.6001 21.7201 4.6801 22.8001 6.0001 22.8001H18.0001C19.3201 22.8001 20.4001 21.7201 20.4001 20.4001V10.8001C20.4001 9.48007 19.3201 8.40007 18.0001 8.40007ZM9.6001 6.00007C9.6001 4.68007 10.6801 3.60007 12.0001 3.60007C13.3201 3.60007 14.4001 4.68007 14.4001 6.00007V8.40007H9.6001V6.00007ZM18.0001 20.4001H6.0001V10.8001H18.0001V20.4001Z",
    "M13.2001 13.2001H10.8001V18.0001H13.2001V13.2001Z",
  ],
  "0 0 24 24",
  14,
);

export function LockIcon({ size = 44, ...props }: IconProps) {
  return (
    <svg aria-hidden fill="none" height={size} viewBox="0 0 20 20" width={size} {...props}>
      <path
        data-slot="lock-shackle"
        d="M14 7V5C14 2.79 12.21 1 10 1C7.79 1 6 2.79 6 5V11H8V5C8 3.9 8.9 3 10 3C11.1 3 12 3.9 12 5V7H14Z"
        fill="currentColor"
      />
      <path d="M15 7H5C3.9 7 3 7.9 3 9V17C3 18.1 3.9 19 5 19H15C16.1 19 17 18.1 17 17V9C17 7.9 16.1 7 15 7ZM11 15H9V11H11V15Z" fill="currentColor" />
    </svg>
  );
}
