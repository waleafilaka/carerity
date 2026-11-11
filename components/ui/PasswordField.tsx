"use client";

import {
  useId,
  useState,
} from "react";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;

  placeholder?: string;

  autoComplete?:
    | "current-password"
    | "new-password";

  error?: string;

  accent?:
    | "purple"
    | "emerald";

  disabled?: boolean;

  name?: string;

  showRequirements?: boolean;
};

export default function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  error = "",
  accent = "purple",
  disabled = false,
  name,
  showRequirements = false,
}: PasswordFieldProps) {
  const generatedId = useId();

  const safeId =
    generatedId.replace(
      /:/g,
      ""
    );

  const inputId =
    name ||
    `password-${safeId}`;

  const errorId =
    `${inputId}-error`;

  const requirementsId =
    `${inputId}-requirements`;

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const focusClasses =
    accent === "emerald"
      ? "focus:border-emerald-400 focus:ring-emerald-100"
      : "focus:border-purple-400 focus:ring-purple-100";

  const accentTextClass =
    accent === "emerald"
      ? "text-emerald-700"
      : "text-purple-700";

  const hasEightCharacters =
    value.length >= 8;

  const hasLetter =
    /[A-Za-z]/.test(
      value
    );

  const hasNumber =
    /\d/.test(
      value
    );

  const describedBy = [
    error
      ? errorId
      : "",
    showRequirements
      ? requirementsId
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  function togglePasswordVisibility() {
    if (disabled) {
      return;
    }

    setShowPassword(
      (current) =>
        !current
    );
  }

  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className="block text-sm font-bold text-gray-900"
      >
        {label}
      </label>

      <div className="relative mt-2">
        <input
          id={inputId}
          name={name}
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={value}
          onChange={(
            event
          ) =>
            onChange(
              event.target.value
            )
          }
          placeholder={
            placeholder
          }
          autoComplete={
            autoComplete
          }
          disabled={
            disabled
          }
          required
          spellCheck={
            false
          }
          autoCapitalize="none"
          autoCorrect="off"
          aria-invalid={
            Boolean(
              error
            )
          }
          aria-describedby={
            describedBy ||
            undefined
          }
          className={`min-h-[52px] w-full rounded-xl border px-4 py-3 pr-20 text-base outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-100"
              : `border-gray-300 ${focusClasses}`
          }`}
        />

        <button
          type="button"
          onClick={
            togglePasswordVisibility
          }
          disabled={
            disabled
          }
          aria-label={
            showPassword
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={
            showPassword
          }
          className={`absolute inset-y-0 right-0 z-20 flex min-h-[52px] min-w-[68px] touch-manipulation select-none items-center justify-center rounded-r-xl px-4 text-sm font-bold ${
            showPassword
              ? accentTextClass
              : "text-gray-500"
          } disabled:cursor-not-allowed disabled:text-gray-300`}
        >
          {showPassword
            ? "Hide"
            : "Show"}
        </button>
      </div>

      {showRequirements && (
        <div
          id={
            requirementsId
          }
          className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
        >
          <Requirement
            complete={
              hasEightCharacters
            }
            label="8+ characters"
            accent={
              accent
            }
          />

          <Requirement
            complete={
              hasLetter
            }
            label="One letter"
            accent={
              accent
            }
          />

          <Requirement
            complete={
              hasNumber
            }
            label="One number"
            accent={
              accent
            }
          />
        </div>
      )}

      {error && (
        <p
          id={errorId}
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function Requirement({
  complete,
  label,
  accent,
}: {
  complete: boolean;
  label: string;

  accent:
    | "purple"
    | "emerald";
}) {
  const completedClass =
    accent === "emerald"
      ? "text-emerald-700"
      : "text-purple-700";

  return (
    <span
      className={
        complete
          ? `font-semibold ${completedClass}`
          : "text-gray-500"
      }
    >
      {complete
        ? "✓"
        : "○"}{" "}
      {label}
    </span>
  );
}
