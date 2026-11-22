import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error.js";
import {
  createTaskSchema,
  moveTaskSchema,
  reorderTasksSchema,
  updateTaskSchema,
} from "./task.validation.js";
import {
  createTask,
  deleteTask,
  getBoardTasks,
  getTaskById,
  moveTask,
  reorderTasks,
  updateTask,
} from "./task.service.js";

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
  if (!userId) throw new AppError("Authentication required", 401);
  return userId;
};

export const createTaskController: RequestHandler = async (req, res) => {
  const workspaceId = getRouteParam(req.params.workspaceId, "workspace ID");
  const boardId = getRouteParam(req.params.boardId, "board ID");
  const userId = getUserId(req.session.userId);
  const input = createTaskSchema.parse(req.body);

  const task = await createTask(workspaceId, boardId, userId, input);
  res.status(201).json({
    success: true,
    message: "Task created successfully",
    data: task,
  });
};

export const getBoardTasksController: RequestHandler = async (req, res) => {
  const workspaceId = getRouteParam(req.params.workspaceId, "workspace ID");
  const boardId = getRouteParam(req.params.boardId, "board ID");
  const userId = getUserId(req.session.userId);

  const tasks = await getBoardTasks(workspaceId, boardId, userId);
  res.status(200).json({ success: true, data: tasks });
};

export const getTaskByIdController: RequestHandler = async (req, res) => {
  const workspaceId = getRouteParam(req.params.workspaceId, "workspace ID");
  const boardId = getRouteParam(req.params.boardId, "board ID");
  const taskId = getRouteParam(req.params.taskId, "task ID");
  const userId = getUserId(req.session.userId);

  const task = await getTaskById(workspaceId, boardId, taskId, userId);
  res.status(200).json({ success: true, data: task });
};

export const updateTaskController: RequestHandler = async (req, res) => {
  const workspaceId = getRouteParam(req.params.workspaceId, "workspace ID");
  const boardId = getRouteParam(req.params.boardId, "board ID");
  const taskId = getRouteParam(req.params.taskId, "task ID");
  const userId = getUserId(req.session.userId);
  const input = updateTaskSchema.parse(req.body);

  const task = await updateTask(workspaceId, boardId, taskId, userId, input);
  res.status(200).json({
    success: true,
    message: "Task updated successfully",
    data: task,
  });
};

export const deleteTaskController: RequestHandler = async (req, res) => {
  const workspaceId = getRouteParam(req.params.workspaceId, "workspace ID");
  const boardId = getRouteParam(req.params.boardId, "board ID");
  const taskId = getRouteParam(req.params.taskId, "task ID");
  const userId = getUserId(req.session.userId);

  const task = await deleteTask(workspaceId, boardId, taskId, userId);
  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
    data: task,
  });
};

export const moveTaskController: RequestHandler = async (req, res) => {
  const workspaceId = getRouteParam(req.params.workspaceId, "workspace ID");
  const boardId = getRouteParam(req.params.boardId, "board ID");
  const taskId = getRouteParam(req.params.taskId, "task ID");
  const userId = getUserId(req.session.userId);
  const input = moveTaskSchema.parse(req.body);

  const task = await moveTask(workspaceId, boardId, taskId, userId, input);
  res.status(200).json({
    success: true,
    message: "Task moved successfully",
    data: task,
  });
};

export const reorderTasksController: RequestHandler = async (req, res) => {
  const workspaceId = getRouteParam(req.params.workspaceId, "workspace ID");
  const boardId = getRouteParam(req.params.boardId, "board ID");
  const columnId = getRouteParam(req.params.columnId, "column ID");
  const userId = getUserId(req.session.userId);
  const input = reorderTasksSchema.parse(req.body);

  const tasks = await reorderTasks(
    workspaceId,
    boardId,
    columnId,
    userId,
    input,
  );
  res.status(200).json({
    success: true,
    message: "Tasks reordered successfully",
    data: tasks,
  });
};
