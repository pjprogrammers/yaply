"use client";

export function Countdown({ value }: { value: number }) {
  const label = value > 0 ? String(value) : "GO";
  return (
    <div className="countdown" aria-live="assertive" aria-atomic>
      <span className="countdown__ring" aria-hidden />
      <span className="countdown__value" key={label}>
        {label}
      </span>
      <span className="countdown__hint">Swallow everything</span>
    </div>
  );
}
