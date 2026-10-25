import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email')),
  password: z.string().min(1, 'Password is required'),
});
export type LoginValues = z.infer<typeof loginSchema>;

/** Mirrors the backend rules (docs/api.md, POST /users/setup) so errors show before the request. */
export const setupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'At least 3 characters')
      .max(64, 'At most 64 characters')
      .regex(/^[A-Za-z0-9_.-]+$/, 'Letters, numbers and _ . - only'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .max(128, 'At most 128 characters')
      .regex(/[A-Z]/, 'Add an uppercase letter')
      .regex(/[a-z]/, 'Add a lowercase letter')
      .regex(/[0-9]/, 'Add a number')
      .regex(/[^A-Za-z0-9]/, 'Add a symbol'),
    confirm: z.string().min(1, 'Confirm your password'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
export type SetupValues = z.infer<typeof setupSchema>;
