
import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error.js";

import {
  createBoardSchema,
  updateBoardSchema,
} from "./board.validation.js";

import {
  createBoard,
  getWorkspaceBoards,
  getBoardById,
  updateBoard,
  archiveBoard,
  restoreBoard,
  deleteBoard,
} from "./board.service.js";

const getRouteParam = (
  value: string | string[] | undefined,
  name: string,
): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`Invalid ${name}`, 400);
  }

  return value;
};

// POST /workspaces/:workspaceId/boards
export const createBoardController: RequestHandler =
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

      const validation = createBoardSchema.safeParse(req.body);

      if (!validation.success) {
        throw new AppError("Validation failed", 400);
      }

      const board = await createBoard(
        workspaceId,
        userId,
        validation.data,
      );

      res.status(201).json({
        success: true,
        message: "Board created successfully",
        data: { board },
      });
    } catch (error) {
      next(error);
    }
  };

// GET /workspaces/:workspaceId/boards
export const getWorkspaceBoardsController: RequestHandler =
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

      const result = await getWorkspaceBoards(
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

// GET /workspaces/:workspaceId/boards/:boardId
export const getBoardByIdController: RequestHandler =
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

      const boardId = getRouteParam(
        req.params.boardId,
        "board ID",
      );

      const board = await getBoardById(
        workspaceId,
        boardId,
        userId,
      );

      res.status(200).json({
        success: true,
        data: { board },
      });
    } catch (error) {
      next(error);
    }
  };

// PATCH /workspaces/:workspaceId/boards/:boardId
export const updateBoardController: RequestHandler =
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

      const boardId = getRouteParam(
        req.params.boardId,
        "board ID",
      );

      const validation = updateBoardSchema.safeParse(req.body);

      if (!validation.success) {
        throw new AppError("Validation failed", 400);
      }

      const board = await updateBoard(
        workspaceId,
        boardId,
        userId,
        validation.data,
      );

      res.status(200).json({
        success: true,
        message: "Board updated successfully",
        data: { board },
      });
    } catch (error) {
      next(error);
    }
  };

// PATCH /workspaces/:workspaceId/boards/:boardId/archive
export const archiveBoardController: RequestHandler =
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

      const boardId = getRouteParam(
        req.params.boardId,
        "board ID",
      );

      const board = await archiveBoard(
        workspaceId,
        boardId,
        userId,
      );

      res.status(200).json({
        success: true,
        message: "Board archived successfully",
        data: { board },
      });
    } catch (error) {
      next(error);
    }
  };

// PATCH /workspaces/:workspaceId/boards/:boardId/restore
export const restoreBoardController: RequestHandler =
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

      const boardId = getRouteParam(
        req.params.boardId,
        "board ID",
      );

      const board = await restoreBoard(
        workspaceId,
        boardId,
        userId,
      );

      res.status(200).json({
        success: true,
        message: "Board restored successfully",
        data: { board },
      });
    } catch (error) {
      next(error);
    }
  };

// DELETE /workspaces/:workspaceId/boards/:boardId
export const deleteBoardController: RequestHandler =
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

      const boardId = getRouteParam(
        req.params.boardId,
        "board ID",
      );

      const board = await deleteBoard(
        workspaceId,
        boardId,
        userId,
      );

      res.status(200).json({
        success: true,
        message: "Board permanently deleted",
        data: { board },
      });
    } catch (error) {
      next(error);
    }
  };
