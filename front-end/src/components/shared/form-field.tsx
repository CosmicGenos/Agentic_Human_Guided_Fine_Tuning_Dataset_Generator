import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
}

/** Label + control + inline error/hint. Pass the control as children and give it `id={htmlFor}`. */
export function FormField({ label, htmlFor, error, hint, required, className, labelClassName, children }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className={cn('text-[13px]', labelClassName)}>
        {label}
        {required && <span aria-hidden="true" className="text-destructive"> *</span>}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
