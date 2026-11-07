import type { RequestHandler } from "express";

import { AppError } from "../../utils/app-error.js";
import { authenticateUser } from "./auth.service.js";
import { loginSchema } from "./login.validation.js";

export const login: RequestHandler = async (req, res, next) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError("Validation failed", 400);
    }

    const user = await authenticateUser(validation.data);

    // Regenerate session ID after successful authentication.
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    // Store the authenticated user's ID in the session.
    req.session.userId = user.id;

    // Ensure the session is persisted before responding.
    await new Promise<void>((resolve, reject) => {
      req.session.save((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};