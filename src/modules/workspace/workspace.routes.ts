
import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware.js";

import {
  createWorkspaceController,
  getUserWorkspacesController,
  getWorkspaceByIdController,
  updateWorkspaceController,
  getWorkspaceMembersController,
  addWorkspaceMemberController,
  updateWorkspaceMemberRoleController,
  removeWorkspaceMemberController,
} from "./workspace.controller.js";

const router = Router();

router.use(requireAuth);

// Workspace APIs
router.post("/", createWorkspaceController);
router.get("/", getUserWorkspacesController);
router.get("/:workspaceId", getWorkspaceByIdController);
router.patch("/:workspaceId", updateWorkspaceController);

// Workspace member APIs
router.get(
  "/:workspaceId/members",
  getWorkspaceMembersController,
);

router.post(
  "/:workspaceId/members",
  addWorkspaceMemberController,
);

router.patch(
  "/:workspaceId/members/:memberId/role",
  updateWorkspaceMemberRoleController,
);

router.delete(
  "/:workspaceId/members/:memberId",
  removeWorkspaceMemberController,
);

export default router;
