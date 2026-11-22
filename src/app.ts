
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";

import healthRouter from "./routes/health.routes.js";
import databaseRouter from "./routes/database.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
import workspaceRouter from "./modules/workspace/workspace.routes.js";
import boardRouter from "./modules/board/board.routes.js";
import columnRouter from "./modules/column/column.routes.js";
import taskRouter from "./modules/task/task.routes.js";
import { AppError } from "./utils/app-error.js";
import { sessionMiddleware } from "./config/session.js";
import { ZodError } from "zod";

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
app.use("/api/v1/workspaces", workspaceRouter);
app.use("/api/v1", boardRouter);
app.use("/api/v1", columnRouter);
app.use("/api/v1", taskRouter);

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

  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof SyntaxError &&
    "status" in error && error.status === 400 &&
    "type" in error && error.type === "entity.parse.failed"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body",
    });

  }

  console.error("Unhandled application error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

app.use(errorHandler);

export default app;
