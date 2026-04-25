import { z } from "zod";

export const PersonaSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(40),
  description: z.string().trim().min(1).max(120),
  emoji: z.string().trim().min(1).max(16),
});

export const ListPersonasResponseSchema = z.object({
  personas: z.array(PersonaSchema),
});

export type Persona = z.infer<typeof PersonaSchema>;
export type ListPersonasResponse = z.infer<typeof ListPersonasResponseSchema>;
