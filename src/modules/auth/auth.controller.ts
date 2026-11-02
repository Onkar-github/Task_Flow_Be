import type { RequestHandler } from "express";

import { AppError } from "../../utils/app-error.js";
import { registerSchema } from "./auth.validation.js";
import { registerUser } from "./auth.service.js";

export const register: RequestHandler = async (req, res, next) => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError("Validation failed", 400);
    }

    const user = await registerUser(validation.data);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};