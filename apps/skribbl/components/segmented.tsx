"use client";

type Option<T> = { label: string; value: T };

type SegmentedProps<T extends string | number> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  label: string;
};

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  disabled = false,
  label,
}: SegmentedProps<T>) {
  return (
    <div className="seg" role="group" aria-label={label}>
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
