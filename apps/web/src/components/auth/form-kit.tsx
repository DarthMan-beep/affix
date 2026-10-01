"use client";

import { useId, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Eye, EyeOff, LoaderCircle } from "lucide-react";

const inputClass =
  "h-12 w-full rounded-xl border bg-card px-4 text-[0.95rem] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted-2 focus:border-ink/40 focus:ring-4 focus:ring-spring/40";

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  placeholder,
  error,
  hint,
  aside,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  placeholder?: string;
  error?: string[];
  hint?: string;
  aside?: ReactNode;
  required?: boolean;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[0.88rem] font-medium text-ink">
          {label}
        </label>
        {aside}
      </div>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputClass} mt-2 ${error ? "border-[#c2553a]" : "border-line"}`}
      />
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

export function PasswordField({
  label = "Password",
  name = "password",
  autoComplete = "current-password",
  error,
  hint,
  aside,
}: {
  label?: string;
  name?: string;
  autoComplete?: string;
  error?: string[];
  hint?: string;
  aside?: ReactNode;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[0.88rem] font-medium text-ink">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative mt-2">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${inputClass} pr-12 ${error ? "border-[#c2553a]" : "border-line"}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

function FieldMessage({ id, error, hint }: { id: string; error?: string[]; hint?: string }) {
  if (error?.length) {
    return (
      <p id={`${id}-error`} className="mt-2 flex items-center gap-1.5 text-[0.82rem] text-[#a8432b]">
        <AlertCircle size={14} className="shrink-0" /> {error[0]}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="mt-2 text-[0.8rem] text-muted">
        {hint}
      </p>
    );
  }
  return null;
}

export function SubmitButton({ children, pendingLabel }: { children: ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[0.98rem] font-semibold text-cream transition-[background-color,transform] duration-300 hover:bg-forest-700 active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? (
        <>
          <LoaderCircle size={18} className="animate-spin" /> {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormAlert({ tone = "error", children }: { tone?: "error" | "success"; children: ReactNode }) {
  const success = tone === "success";
  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-[0.88rem] leading-snug ${
        success ? "bg-spring/25 text-leaf-700" : "bg-[#c2553a]/10 text-[#8f3823]"
      }`}
    >
      {success ? (
        <CheckCircle2 size={17} className="mt-px shrink-0" />
      ) : (
        <AlertCircle size={17} className="mt-px shrink-0" />
      )}
      <div>{children}</div>
    </div>
  );
}
