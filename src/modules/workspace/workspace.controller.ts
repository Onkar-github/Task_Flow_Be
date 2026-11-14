import type { RequestHandler } from "express";

import { AppError } from "../../utils/app-error.js";
import { 
    createWorkspaceSchema, 
    updateWorkspaceSchema,
    addWorkspaceMemberSchema,
    updateWorkspaceMemberRoleSchema, } from "./workspace.validation.js";
import { createWorkspace,
    updateWorkspace, 
    getUserWorkspaces,
    getWorkspaceMembers,
    addWorkspaceMember,
    updateWorkspaceMemberRole,
    removeWorkspaceMember, } from "./workspace.service.js";
import { getWorkspaceById } from "./workspace.service.js";

export const createWorkspaceController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const validation = createWorkspaceSchema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError("Validation failed", 400);
    }

    const userId = req.session.userId;

    // Defensive check; the route also uses requireAuth.
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const workspace = await createWorkspace(
      validation.data,
      userId,
    );

    res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      data: {
        workspace,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserWorkspacesController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const workspaces = await getUserWorkspaces(userId);

    res.status(200).json({
      success: true,
      message: "Workspaces retrieved successfully",
      data: {
        workspaces,
        count: workspaces.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceByIdController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const workspaceId = req.params.workspaceId;

    if (typeof workspaceId !== "string" || !workspaceId.trim()) {
    throw new AppError("Invalid workspace ID", 400);
    }

    const workspace = await getWorkspaceById(
    workspaceId,
    userId,
    );
    
    res.status(200).json({
      success: true,
      message: "Workspace retrieved successfully",
      data: {
        workspace,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspaceController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const userId = req.session.userId;
    const workspaceId = req.params.workspaceId;

    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    if (typeof workspaceId !== "string" || !workspaceId.trim()) {
      throw new AppError("Invalid workspace ID", 400);
    }

    const validation = updateWorkspaceSchema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError("Validation failed", 400);
    }

    const workspace = await updateWorkspace(
      workspaceId,
      userId,
      validation.data,
    );

    res.status(200).json({
      success: true,
      message: "Workspace updated successfully",
      data: { workspace },
    });
  } catch (error) {
    next(error);
  }
};

// Helper for Express 5 route parameters.
const getRouteParam = (
  value: string | string[] | undefined,
  name: string,
): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`Invalid ${name}`, 400);
  }

  return value;
};

export const getWorkspaceMembersController: RequestHandler =
  async (req, res, next) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        throw new AppError("Authentication required", 401);
      }

      const workspaceId = getRouteParam(
        req.params.workspaceId,
        "workspace ID",
      );

      const result = await getWorkspaceMembers(
        workspaceId,
        userId,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

export const addWorkspaceMemberController: RequestHandler =
  async (req, res, next) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        throw new AppError("Authentication required", 401);
      }

      const workspaceId = getRouteParam(
        req.params.workspaceId,
        "workspace ID",
      );

      const validation = addWorkspaceMemberSchema.safeParse(
        req.body,
      );

      if (!validation.success) {
        throw new AppError("Validation failed", 400);
      }

      const member = await addWorkspaceMember(
        workspaceId,
        userId,
        validation.data,
      );

      res.status(201).json({
        success: true,
        message: "Member added successfully",
        data: {
          member,
        },
      });
    } catch (error) {
      next(error);
    }
  };

// PATCH /workspaces/:workspaceId/members/:memberId/role
export const updateWorkspaceMemberRoleController: RequestHandler =
  async (req, res, next) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        throw new AppError("Authentication required", 401);
      }

      const workspaceId = getRouteParam(
        req.params.workspaceId,
        "workspace ID",
      );

      const memberId = getRouteParam(
        req.params.memberId,
        "member ID",
      );

      const validation =
        updateWorkspaceMemberRoleSchema.safeParse(req.body);

      if (!validation.success) {
        throw new AppError("Validation failed", 400);
      }

      const member = await updateWorkspaceMemberRole(
        workspaceId,
        userId,
        memberId,
        validation.data,
      );

      res.status(200).json({
        success: true,
        message: "Member role updated successfully",
        data: {
          member,
        },
      });
    } catch (error) {
      next(error);
    }
  };

// DELETE /workspaces/:workspaceId/members/:memberId
export const removeWorkspaceMemberController: RequestHandler =
  async (req, res, next) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        throw new AppError("Authentication required", 401);
      }

      const workspaceId = getRouteParam(
        req.params.workspaceId,
        "workspace ID",
      );

      const memberId = getRouteParam(
        req.params.memberId,
        "member ID",
      );

      const result = await removeWorkspaceMember(
        workspaceId,
        userId,
        memberId,
      );

      res.status(200).json({
        success: true,
        message: "Member removed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };