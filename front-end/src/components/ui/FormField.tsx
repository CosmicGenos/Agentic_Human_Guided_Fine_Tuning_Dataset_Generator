import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}

export default function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-soft tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-danger mt-0.5">{error}</p>}
    </div>
  );
}
