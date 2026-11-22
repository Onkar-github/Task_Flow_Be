
import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware.js";

import {
  createColumnController,
  getBoardColumnsController,
  updateColumnController,
  deleteColumnController,
  reorderColumnsController,
} from "./column.controller.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/workspaces/:workspaceId/boards/:boardId/columns",
  createColumnController,
);

router.get(
  "/workspaces/:workspaceId/boards/:boardId/columns",
  getBoardColumnsController,
);

router.patch(
  "/workspaces/:workspaceId/boards/:boardId/columns/reorder",
  reorderColumnsController,
);

router.patch(
  "/workspaces/:workspaceId/boards/:boardId/columns/:columnId",
  updateColumnController,
);

router.delete(
  "/workspaces/:workspaceId/boards/:boardId/columns/:columnId",
  deleteColumnController,
);

export default router;
