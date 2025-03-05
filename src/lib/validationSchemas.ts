import { z } from "zod";

export const taxReturnSchema = z.object({
  assessmentYear: z.string(),
  status: z.enum(["DRAFT", "FINAL"]),
  data: z.any(),
});
