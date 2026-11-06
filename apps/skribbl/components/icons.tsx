import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 11a8 8 0 0 0-14.9-3M4 5v6h6" />
      <path d="M4 13a8 8 0 0 0 14.9 3M20 19v-6h-6" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a1 1 0 0 1 1-1h9" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 5.5v13l10-6.5-10-6.5Z" />
    </svg>
  );
}

export function ThumbUpIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.58 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function ThumbDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8" />
      <path d="M17.5 13.5A5.5 5.5 0 0 1 20.5 19" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10Z" />
      <path d="M8 8h8M8 12h5" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
      <path d="m14 7 3 3" />
    </svg>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 7 4 12l5 5" />
      <path d="M4 12h9a6 6 0 0 1 6 6" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M6.5 7 7.5 20h9L17.5 7" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z" />
    </svg>
  );
}

export function CrownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m4 8 4 3 4-6 4 6 4-3-2 10H6L4 8Z" />
      <path d="M6 21h12" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
    </svg>
  );
}

export function WifiIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 9a13 13 0 0 1 16 0" />
      <path d="M7 12.5a8.5 8.5 0 0 1 10 0" />
      <path d="M10 16a4 4 0 0 1 4 0" />
      <circle cx="12" cy="19" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function SkribblMark(props: IconProps) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden {...props}>
      <rect width="24" height="24" rx="7" fill="#ffffff" />
      <path
        d="M6 16.5c2.2-1.2 3-5.5 5.1-5.5 2.2 0 1.2 4.2 3.3 4.2 1.4 0 2-1.3 3.6-3.7"
        fill="none"
        stroke="#000000"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
