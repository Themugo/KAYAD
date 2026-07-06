import { z } from "zod";

// Password must have: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: strongPassword,
  phone: z.string().optional(),
  role: z.enum(["dealer", "user"]).optional(),
  referralCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: strongPassword,
});

export const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const forgotPasswordSchema = emailSchema;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: strongPassword,
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  businessName: z.string().optional(),
  bio: z.string().optional(),
  visibility: z.string().optional(),
  mpesaBusiness: z.string().optional(),
  mpesaBusinessName: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankBranch: z.string().optional(),
  notifications: z.object({ sms: z.boolean() }).optional(),
});
