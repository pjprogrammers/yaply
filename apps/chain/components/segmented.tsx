"use client";

type Option<T> = { label: string; value: T };

type SegmentedProps<T extends string | number> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  label: string;
  wrap?: boolean;
};

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  disabled = false,
  label,
  wrap = false,
}: SegmentedProps<T>) {
  return (
    <div className={`seg ${wrap ? "seg--wrap" : ""}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={option.value === value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
