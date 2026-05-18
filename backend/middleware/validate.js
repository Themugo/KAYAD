import { validationError, error } from "../utils/response.js";
import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validation/auth.schema.js";
import { createCarSchema, updateCarSchema } from "../validation/car.schema.js";

const bidSchema = z.object({
  amount: z.number().positive("Bid must be positive").max(100_000_000),
  phone: z.string().regex(/^2547\d{8}$/, "Phone must be a valid Safaricom number starting with 2547"),
});

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  req.body = result.data;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  req.query = result.data;
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  next();
};

export const validateObjectId = (req, res, next) => {
  const id = req.params.id;
  if (!id || !/^[0-9a-f]{24}$/i.test(id)) {
    return error(res, "Invalid ID format", 400);
  }
  next();
};

export const validateAuth = (req, res, next) => {
  const path = req.path;
  let schema;
  if (path === "/register") schema = registerSchema;
  else if (path === "/login") schema = loginSchema;
  else if (path === "/change-password") schema = changePasswordSchema;
  else if (path === "/forgot-password") schema = forgotPasswordSchema;
  else if (path === "/reset-password") schema = resetPasswordSchema;
  else if (path === "/profile" && req.method === "PUT") schema = updateProfileSchema;
  else return next();

  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  req.body = result.data;
  next();
};

export const validateBid = (req, res, next) => {
  const result = bidSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  req.body = result.data;
  next();
};

export const validateCar = (req, res, next) => {
  const isUpdate = req.method === "PUT";
  const schema = isUpdate ? updateCarSchema : createCarSchema;
  const data = isUpdate ? req.body : { ...req.body };

  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  if (!isUpdate) req.body = result.data;
  else Object.assign(req.body, result.data);
  next();
};
