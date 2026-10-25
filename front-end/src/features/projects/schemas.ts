import { z } from 'zod';

export const projectSchema = z.object({
  title: z.string().trim().min(1, 'Give the project a title').max(200, 'At most 200 characters'),
  description: z.string().max(5000, 'Too long'),
  data_type: z.enum(['fiction', 'academic']),
});
export type ProjectValues = z.infer<typeof projectSchema>;
