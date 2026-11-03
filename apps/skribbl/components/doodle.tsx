type DoodleProps = {
  className?: string;
};

function classNameWithBase(className?: string): string {
  return `doodle ${className ?? ""}`.trim();
}

export function CatDoodle({ className }: DoodleProps) {
  return (
    <svg
      className={classNameWithBase(className)}
      viewBox="0 0 320 200"
      role="img"
      aria-label="A line drawing of a cat wearing a party hat"
    >
      <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M108 92c-8-20-9-38-4-52 14 6 25 15 32 27" />
        <path d="M196 92c8-20 9-38 4-52-14 6-25 15-32 27" />
        <path d="M108 92c0 42 24 66 52 66s52-24 52-66c0-28-23-48-52-48s-52 20-52 48Z" />
        <path d="M142 108c0 5 4 8 9 8s9-3 9-8" />
        <path d="M160 116v10c0 4-3 6-7 6" />
        <path d="M126 104c4-4 9-4 13 0M181 104c4-4 9-4 13 0" />
        <path d="M104 112l-26-5M105 122l-26 6M216 112l26-5M215 122l26 6" />
        <path d="M154 52 166 22l14 32" />
        <path d="M166 22c5 3 9 3 14 0" />
        <circle cx="166" cy="14" r="4" fill="currentColor" stroke="none" />
        <path d="M120 158c-12 8-20 20-22 34M200 158c12 8 20 20 22 34" />
      </g>
      <g fill="currentColor">
        <circle cx="166" cy="108" r="3" />
      </g>
    </svg>
  );
}

export function RocketDoodle({ className }: DoodleProps) {
  return (
    <svg
      className={classNameWithBase(className)}
      viewBox="0 0 320 200"
      role="img"
      aria-label="A line drawing of a rocket lifting off"
    >
      <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M164 24c-29 28-43 65-43 106h86c0-41-14-78-43-106Z" />
        <circle cx="164" cy="90" r="15" />
        <path d="M121 110c-19 17-27 34-27 50 16-2 29-9 41-23" />
        <path d="M207 110c19 17 27 34 27 50-16-2-29-9-41-23" />
        <path d="M145 130c-4 18-5 31-2 43 7-5 14-5 21-1 7-4 14-4 21 1 3-12 2-25-2-43" />
        <path d="M164 24V8" />
        <circle cx="164" cy="5" r="3" fill="currentColor" stroke="none" />
        <path d="M88 68c-11 2-20 9-26 18M84 90c-13 3-23 11-30 21" />
        <path d="M252 68c11 2 20 9 26 18M256 90c13 3 23 11 30 21" />
      </g>
    </svg>
  );
}

export function FishDoodle({ className }: DoodleProps) {
  return (
    <svg
      className={classNameWithBase(className)}
      viewBox="0 0 320 200"
      role="img"
      aria-label="A line drawing of a fish blowing bubbles"
    >
      <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M108 100c24-43 82-55 124-28 14 9 26 19 42 28-16 9-28 19-42 28-42 27-100 15-124-28Z" />
        <path d="M108 100 64 72v56l44-28Z" />
        <path d="M166 112c7 12 19 18 32 16-8-8-12-16-12-25" />
        <path d="M218 82c5-2 10-1 14 2" />
        <circle cx="236" cy="92" r="4" fill="currentColor" stroke="none" />
        <path d="M266 100c-4 2-6 5-6 9" />
        <circle cx="286" cy="68" r="5" />
        <circle cx="300" cy="48" r="3" />
        <circle cx="278" cy="44" r="2.5" />
      </g>
    </svg>
  );
}
