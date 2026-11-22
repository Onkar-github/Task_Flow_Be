import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  createTaskController,
  deleteTaskController,
  getBoardTasksController,
  getTaskByIdController,
  moveTaskController,
  reorderTasksController,
  updateTaskController,
} from "./task.controller.js";

const router = Router();
router.use(requireAuth);

router.post(
  "/workspaces/:workspaceId/boards/:boardId/tasks",
  createTaskController,
);
router.get(
  "/workspaces/:workspaceId/boards/:boardId/tasks",
  getBoardTasksController,
);
router.patch(
  "/workspaces/:workspaceId/boards/:boardId/columns/:columnId/tasks/reorder",
  reorderTasksController,
);
router.get(
  "/workspaces/:workspaceId/boards/:boardId/tasks/:taskId",
  getTaskByIdController,
);
router.patch(
  "/workspaces/:workspaceId/boards/:boardId/tasks/:taskId/move",
  moveTaskController,
);
router.patch(
  "/workspaces/:workspaceId/boards/:boardId/tasks/:taskId",
  updateTaskController,
);
router.delete(
  "/workspaces/:workspaceId/boards/:boardId/tasks/:taskId",
  deleteTaskController,
);

export default router;
