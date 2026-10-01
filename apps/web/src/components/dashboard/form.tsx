"use client";

import { useId, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

/*
 * Dashboard form controls. Same look as the sign-in fields
 * (components/auth/form-kit.tsx), plus the selects, text areas and
 * prefixed number inputs the dashboard needs.
 */

const control =
  "w-full rounded-xl border bg-card px-4 text-[0.95rem] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted-2 focus:border-ink/40 focus:ring-4 focus:ring-spring/40";

const border = (error?: string[]) => (error?.length ? "border-[#c2553a]" : "border-line");

function Shell({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string[];
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[0.88rem] font-medium text-ink">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error?.length ? (
        <p id={`${id}-error`} className="mt-2 flex items-center gap-1.5 text-[0.82rem] text-[#a8432b]">
          <AlertCircle size={14} className="shrink-0" /> {error[0]}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-[0.8rem] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string[], hint?: string) =>
  error?.length ? `${id}-error` : hint ? `${id}-hint` : undefined;

type Common = {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string[];
  hint?: string;
  required?: boolean;
};

export function TextInput({
  label,
  name,
  defaultValue,
  error,
  hint,
  required = true,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  prefix,
  suffix,
  maxLength,
}: Common & {
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "decimal" | "numeric" | "email";
  prefix?: string;
  suffix?: string;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        {prefix && (
          <span className="font-mono pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[0.95rem] text-muted">
            {prefix}
          </span>
        )}
        <input
          id={id}
          name={name}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          aria-invalid={error?.length ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={`${control} h-12 ${prefix ? "pl-9" : ""} ${suffix ? "pr-16" : ""} ${border(error)}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[0.85rem] text-muted">
            {suffix}
          </span>
        )}
      </div>
    </Shell>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  error,
  hint,
  required = false,
  rows = 5,
  placeholder,
  maxLength,
}: Common & { rows?: number; placeholder?: string; maxLength?: number }) {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        aria-invalid={error?.length ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${control} block resize-y py-3 leading-relaxed ${border(error)}`}
      />
    </Shell>
  );
}

export function Select({
  label,
  name,
  defaultValue,
  error,
  hint,
  required = true,
  options,
  placeholder,
}: Common & { options: { value: string; label: string }[]; placeholder?: string }) {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        aria-invalid={error?.length ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${control} h-12 cursor-pointer appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-11 ${border(error)}`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2354655b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")",
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}
