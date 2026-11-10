import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function SpyMark({ size = 28, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      {...props}
    >
      <rect width="64" height="64" rx="14" fill="#f2b33d" />
      <circle cx="27" cy="25" r="12" fill="none" stroke="#0d0b12" strokeWidth="6" />
      <path d="M36 35 51 50" stroke="#0d0b12" strokeWidth="8" strokeLinecap="round" />
      <path d="m44 43 6-6 8 8-6 6z" fill="#e9479f" transform="rotate(45 49 47)" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 5.5v13l10-6.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="8.5" y="8.5" width="10" height="10" rx="1" />
      <path d="M5.5 15.5h-1v-10h10v1" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m5 12.5 4.5 4.5L19 6.5" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="10.5" width="14" height="9" rx="1.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14v2" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.4-3 2.6-4.5 5.5-4.5s5.1 1.5 5.5 4.5" />
      <path d="M15.5 6.2a3 3 0 0 1 0 5.6M17 14.7c2.1.3 3.3 1.7 3.6 4.3" />
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

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.3A10.6 10.6 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-2.7 3.4M6.3 6.8C3.9 8.6 2.5 12 2.5 12s3.5 7 9.5 7c1.4 0 2.7-.4 3.8-1" />
      <path d="M10.2 10.2a2.6 2.6 0 0 0 3.6 3.6" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 11.5 20 4l-6 16-3.4-7.2L4 11.5Z" />
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21M9 21h6" />
    </svg>
  );
}

export function MicOffIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4l16 16" />
      <path d="M9 6.3V6a3 3 0 0 1 6 0v6c0 .6-.2 1.1-.5 1.6M6 11.5a6 6 0 0 0 9 5.2M12 17.5V21M9 21h6" />
    </svg>
  );
}

export function SpeakerIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z" />
      <path d="M16 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </svg>
  );
}

export function LeaveIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 4.5H5v15h9M10 12h10M16.5 8l3.5 4-3.5 4" />
    </svg>
  );
}

export function CrownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 8.5 8 12l4-6 4 6 4-3.5-1.6 9H5.6L4 8.5Z" />
      <path d="M6 19.5h12" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 19 6v6c0 4-3 6.8-7 8.5-4-1.7-7-4.5-7-8.5V6l7-2.5Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M18.4 9A7 7 0 0 0 6.2 6.6L4 9M5.6 15A7 7 0 0 0 17.8 17.4L20 15" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function ExpandIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
    </svg>
  );
}

export function WifiIcon({ offline = false, ...props }: IconProps & { offline?: boolean }) {
  return (
    <svg {...base(props)}>
      {offline ? (
        <>
          <path d="M4 4l16 16" />
          <path d="M8.5 15.5a5 5 0 0 1 7 0M5.5 12a9.5 9.5 0 0 1 3-1.9M15.5 10.1a9.5 9.5 0 0 1 3 1.9M2.5 8.5a13 13 0 0 1 4.2-2.4M17.3 6.1a13 13 0 0 1 4.2 2.4" />
          <circle cx="12" cy="19" r=".7" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          <path d="M2.5 8.5a13 13 0 0 1 19 0M5.5 12a9.5 9.5 0 0 1 13 0M8.5 15.5a5 5 0 0 1 7 0" />
          <circle cx="12" cy="19" r=".7" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
