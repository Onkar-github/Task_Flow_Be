
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";

import healthRouter from "./routes/health.routes.js";
import databaseRouter from "./routes/database.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
import { AppError } from "./utils/app-error.js";
import { sessionMiddleware } from "./config/session.js";

const app = express();

// Parse incoming JSON requests.
app.use(express.json({ limit: "1mb" }));

// Parse URL-encoded requests.
app.use(express.urlencoded({ extended: true }));

// Session middleware must run before routes.
app.use(sessionMiddleware);

// Health check route.
app.use("/api/v1/health", healthRouter);
app.use("/api/v1/database", databaseRouter);
app.use("/api/v1/auth", authRouter);


// Handle unknown routes.
const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

app.use(notFoundHandler);

// Centralized error handler.
const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });

    return;
  }

  console.error("Unhandled application error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

app.use(errorHandler);

export default app;
