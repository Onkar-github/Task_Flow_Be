
import type { RequestHandler } from "express";

import { AppError } from "../../utils/app-error.js";

import {
  createColumnSchema,
  updateColumnSchema,
  reorderColumnsSchema,
} from "./column.validation.js";

import {
  createColumn,
  getBoardColumns,
  updateColumn,
  deleteColumn,
  reorderColumns,
} from "./column.service.js";

const getRouteParam = (
  value: string | string[] | undefined,
  name: string,
): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`Invalid ${name}`, 400);
  }

  return value;
};

const getUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new AppError("Authentication required", 401);
  }

  return userId;
};

// POST: Create column
export const createColumnController: RequestHandler = async (
  req,
  res,
) => {
  const workspaceId = getRouteParam(req.params.workspaceId, "workspace ID");
  const boardId = getRouteParam(req.params.boardId, "board ID");
  const userId = getUserId(req.session.userId);

  const input = createColumnSchema.parse(req.body);

  const column = await createColumn(
    workspaceId,
    boardId,
    userId,
    input,
  );

  res.status(201).json({
    success: true,
    message: "Column created successfully",
    data: column,
  });
};

// GET: List columns
export const getBoardColumnsController: RequestHandler = async (
  req,
  res,
) => {
  const workspaceId = getRouteParam(req.params.workspaceId, "workspace ID");
  const boardId = getRouteParam(req.params.boardId, "board ID");
  const userId = getUserId(req.session.userId);

  const columns = await getBoardColumns(
    workspaceId,
    boardId,
    userId,
  );

  res.status(200).json({
    success: true,
    data: columns,
  });
};

// PATCH: Rename column
export const updateColumnController: RequestHandler = async (
  req,
  res,
) => {
  const workspaceId = getRouteParam(req.params.workspaceId, "workspace ID");
  const boardId = getRouteParam(req.params.boardId, "board ID");
  const columnId = getRouteParam(req.params.columnId, "column ID");
  const userId = getUserId(req.session.userId);

  const input = updateColumnSchema.parse(req.body);

  const column = await updateColumn(
    workspaceId,
    boardId,
    columnId,
    userId,
    input,
  );

  res.status(200).json({
    success: true,
    message: "Column updated successfully",
    data: column,
  });
};

// DELETE: Delete column
export const deleteColumnController: RequestHandler = async (
  req,
  res,
) => {
  const workspaceId = getRouteParam(req.params.workspaceId, "workspace ID");
  const boardId = getRouteParam(req.params.boardId, "board ID");
  const columnId = getRouteParam(req.params.columnId, "column ID");
  const userId = getUserId(req.session.userId);

  const column = await deleteColumn(
    workspaceId,
    boardId,
    columnId,
    userId,
  );

  res.status(200).json({
    success: true,
    message: "Column deleted successfully",
    data: column,
  });
};

// PATCH: Reorder columns
export const reorderColumnsController: RequestHandler = async (
  req,
  res,
) => {
  const workspaceId = getRouteParam(req.params.workspaceId, "workspace ID");
  const boardId = getRouteParam(req.params.boardId, "board ID");
  const userId = getUserId(req.session.userId);

  const input = reorderColumnsSchema.parse(req.body);

  const columns = await reorderColumns(
    workspaceId,
    boardId,
    userId,
    input,
  );

  res.status(200).json({
    success: true,
    message: "Columns reordered successfully",
    data: columns,
  });
};
