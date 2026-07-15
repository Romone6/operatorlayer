import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(2),
  workEmail: z.string().email(),
  company: z.string().min(2),
  role: z.string().min(2),
  companySize: z.string().min(1),
  currentAiTools: z.array(z.string()).min(1),
  primaryUseCase: z.string().min(1),
  message: z.string().min(5),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const playgroundInputSchema = z.object({
  inputMessage: z.string().min(5),
  channel: z.string().min(1),
  team: z.string().min(1),
  customerType: z.string().min(1),
  context: z.string().optional(),
  draft: z.string().optional(),
});

export type PlaygroundInputValues = z.infer<typeof playgroundInputSchema>;

