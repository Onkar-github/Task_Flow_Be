
import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";

import {
  createBoardController,
  getWorkspaceBoardsController,
  getBoardByIdController,
  updateBoardController,
  archiveBoardController,
  restoreBoardController,
  deleteBoardController,
} from "./board.controller.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/workspaces/:workspaceId/boards",
  createBoardController,
);

router.get(
  "/workspaces/:workspaceId/boards",
  getWorkspaceBoardsController,
);

router.get(
  "/workspaces/:workspaceId/boards/:boardId",
  getBoardByIdController,
);

router.patch(
  "/workspaces/:workspaceId/boards/:boardId",
  updateBoardController,
);

router.patch(
  "/workspaces/:workspaceId/boards/:boardId/archive",
  archiveBoardController,
);

router.patch(
  "/workspaces/:workspaceId/boards/:boardId/restore",
  restoreBoardController,
);

router.delete(
  "/workspaces/:workspaceId/boards/:boardId",
  deleteBoardController,
);

export default router;
