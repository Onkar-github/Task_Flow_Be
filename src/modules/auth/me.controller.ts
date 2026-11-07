import type { RequestHandler } from "express";

import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../config/database.js";

export const getCurrentUser: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError("User account no longer exists", 401);
    }

    res.status(200).json({
      success: true,
      message: "Authenticated user retrieved successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};