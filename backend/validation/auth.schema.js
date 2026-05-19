import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  phone: z.string().optional(),
  role: z.enum(["dealer", "broker", "individual_seller", "user", "admin"]).optional(),
  businessName: z.string().optional(),
  location: z.string().optional(),
  referralCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(128),
});

export const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const forgotPasswordSchema = emailSchema;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
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
