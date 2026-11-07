import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error.js";

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.session.userId) {
    next(new AppError("Authentication required", 401));
    return;
  }

  next();
};