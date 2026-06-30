import { z } from "zod";

// Central client-side schemas — server enforces via triggers/CHECK constraints too.

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .max(30, "At most 30 characters")
  .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscores only");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(80, "At most 80 characters");

export const bioSchema = z.string().trim().max(280, "At most 280 characters").optional().or(z.literal(""));

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(5000, "At most 5000 characters");

export const feedbackTitleSchema = z.string().trim().min(3, "At least 3 characters").max(120);
export const feedbackBodySchema = z.string().trim().min(10, "At least 10 characters").max(2000);

export const guidanceMessageSchema = z.string().trim().min(1).max(1000);

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(128, "At most 128 characters");
