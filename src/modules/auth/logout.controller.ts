import type { RequestHandler } from "express";

import { env } from "../../config/env.js";

export const logout: RequestHandler = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      next(error);
      return;
    }

    // Remove the session cookie from the browser.
    res.clearCookie("ai_task_flow.sid", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  });
};