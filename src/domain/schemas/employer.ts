import { z } from "zod";

export const employerSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  logoUrl: z.string().url(),
  recruiterName: z.string(),
  recruiterAvatarUrl: z.string().url(),
  location: z.string(),
});

export type Employer = z.infer<typeof employerSchema>;
