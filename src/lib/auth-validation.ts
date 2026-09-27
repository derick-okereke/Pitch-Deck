import { z } from "zod";

export const accountPasswordSchema = z.string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use no more than 128 characters.")
  .regex(/[A-Z]/u, "Add at least one capital letter.")
  .regex(/[0-9]/u, "Add at least one number.")
  .regex(/[^A-Za-z0-9]/u, "Add at least one special character.");
