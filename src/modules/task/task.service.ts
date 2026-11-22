import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import type { Prisma, TaskPriority } from "../../generated/prisma/client.js";
import { requireWorkspaceRole } from "../workspace/workspace.authorization.js";
import type {
  CreateTaskInput,
  MoveTaskInput,
  ReorderTasksInput,
  UpdateTaskInput,
} from "./task.validation.js";

const VIEW_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
const TASK_WRITE_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
const ASSIGNABLE_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;

/**
 * All task mutations lock the parent Board row first. This deliberately
 * serializes mutations within one board for the MVP, preventing races with
 * board archive/permanent deletion and with column deletion. We can optimize
 * to per-column locking after measuring contention.
 */
const lockAndCheckBoard = async (
  tx: Prisma.TransactionClient,
  workspaceId: string,
  boardId: string,
) => {
  const rows = await tx.$queryRaw<Array<{ id: string; archivedAt: Date | null }>>`
    SELECT "id", "archivedAt"
    FROM "Board"
    WHERE "id" = ${boardId}::uuid
      AND "workspaceId" = ${workspaceId}::uuid
    FOR UPDATE
  `;

  const board = rows[0];
  if (!board || board.archivedAt) {
    throw new AppError("Board not found", 404);
  }
  return board;
};

const requireBoardRole = async (
  tx: Prisma.TransactionClient,
  workspaceId: string,
  boardId: string,
  userId: string,
  allowedRoles: readonly ("OWNER" | "ADMIN" | "MEMBER" | "VIEWER")[],
  lock = false,
) => {
  await requireWorkspaceRole(tx, userId, workspaceId, allowedRoles);
  if (lock) {
    await lockAndCheckBoard(tx, workspaceId, boardId);
    return;
  }

  const board = await tx.board.findFirst({
    where: { id: boardId, workspaceId, archivedAt: null },
    select: { id: true },
  });
  if (!board) throw new AppError("Board not found", 404);
};

const verifyAssignableMember = async (
  tx: Prisma.TransactionClient,
  workspaceId: string,
  assigneeId: string,
) => {
  const membership = await tx.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: assigneeId, workspaceId },
    },
    select: { role: true },
  });

  if (!membership || !ASSIGNABLE_ROLES.some((role) => role === membership.role)) {
    throw new AppError(
      "Assignee must be an Owner, Admin, or Member of this workspace",
      400,
    );
  }
};

const ensureColumnBelongsToBoard = async (
  tx: Prisma.TransactionClient,
  boardId: string,
  columnId: string,
) => {
  const column = await tx.boardColumn.findFirst({
    where: { id: columnId, boardId },
    select: { id: true },
  });
  if (!column) throw new AppError("Column not found in this board", 404);
  return column;
};

const compactColumnPositions = async (
  tx: Prisma.TransactionClient,
  columnId: string,
) => {
  const tasks = await tx.task.findMany({
    where: { columnId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  for (const [position, task] of tasks.entries()) {
    await tx.task.update({ where: { id: task.id }, data: { position } });
  }
};

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  column: { select: { id: true, name: true, position: true } },
} satisfies Prisma.TaskInclude;

export const createTask = async (
  workspaceId: string,
  boardId: string,
  userId: string,
  input: CreateTaskInput,
) => {
  const createdTaskId = await prisma.$transaction(async (tx) => {
    await requireBoardRole(tx, workspaceId, boardId, userId, TASK_WRITE_ROLES, true);
    await ensureColumnBelongsToBoard(tx, boardId, input.columnId);

    if (input.assigneeId) {
      await verifyAssignableMember(tx, workspaceId, input.assigneeId);
    }

    const lastTask = await tx.task.aggregate({
      where: { columnId: input.columnId },
      _max: { position: true },
    });
    const position = (lastTask._max.position ?? -1) + 1;

    const createdTask = await tx.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        priority: (input.priority ?? "MEDIUM") as TaskPriority,
        position,
        boardId,
        columnId: input.columnId,
        createdById: userId,
        assigneeId: input.assigneeId ?? null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      },
      select: { id: true },
    });

    return createdTask.id;
  });

  // Load relations after the transaction has committed. This avoids relation
  // loading on the interactive transaction's single PostgreSQL connection.
  const task = await prisma.task.findUnique({
    where: { id: createdTaskId },
    include: taskInclude,
  });
  if (!task) throw new AppError("Task not found", 404);
  return task;
};

export const getBoardTasks = async (
  workspaceId: string,
  boardId: string,
  userId: string,
  columnId?: string,
) => {
  // Keep authorization and active-board checks together, but perform relation
  // loading after the transaction to avoid pg adapter query overlap warnings.
  await prisma.$transaction(async (tx) => {
    await requireBoardRole(tx, workspaceId, boardId, userId, VIEW_ROLES);
  });

  return prisma.task.findMany({
    where: { boardId, ...(columnId ? { columnId } : {}) },
    orderBy: [
      { columnId: "asc" },
      { position: "asc" },
    ],
    include: taskInclude,
  });
};

export const getTaskById = async (
  workspaceId: string,
  boardId: string,
  taskId: string,
  userId: string,
) => {
  await prisma.$transaction(async (tx) => {
    await requireBoardRole(tx, workspaceId, boardId, userId, VIEW_ROLES);

    const task = await tx.task.findFirst({
      where: { id: taskId, boardId },
      select: { id: true },
    });
    if (!task) throw new AppError("Task not found", 404);
  });

  const task = await prisma.task.findFirst({
    where: { id: taskId, boardId },
    include: taskInclude,
  });
  if (!task) throw new AppError("Task not found", 404);
  return task;
};

export const updateTask = async (
  workspaceId: string,
  boardId: string,
  taskId: string,
  userId: string,
  input: UpdateTaskInput,
) => {
  const updatedTaskId = await prisma.$transaction(async (tx) => {
    await requireBoardRole(tx, workspaceId, boardId, userId, TASK_WRITE_ROLES, true);

    const existingTask = await tx.task.findFirst({
      where: { id: taskId, boardId },
      select: { id: true },
    });
    if (!existingTask) throw new AppError("Task not found", 404);

    if (input.assigneeId) {
      await verifyAssignableMember(tx, workspaceId, input.assigneeId);
    }

    const data: Prisma.TaskUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.dueDate !== undefined) {
      data.dueDate = input.dueDate === null ? null : new Date(input.dueDate);
    }
    if (input.assigneeId !== undefined) {
      data.assignee = input.assigneeId === null
        ? { disconnect: true }
        : { connect: { id: input.assigneeId } };
    }

    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data,
      select: { id: true },
    });

    return updatedTask.id;
  });

  const task = await prisma.task.findUnique({
    where: { id: updatedTaskId },
    include: taskInclude,
  });
  if (!task) throw new AppError("Task not found", 404);
  return task;
};

export const deleteTask = async (
  workspaceId: string,
  boardId: string,
  taskId: string,
  userId: string,
) => {
  return prisma.$transaction(async (tx) => {
    await requireBoardRole(tx, workspaceId, boardId, userId, TASK_WRITE_ROLES, true);

    const task = await tx.task.findFirst({
      where: { id: taskId, boardId },
      select: { id: true, columnId: true, title: true },
    });
    if (!task) throw new AppError("Task not found", 404);

    const deleted = await tx.task.delete({
      where: { id: task.id },
      select: { id: true, title: true, boardId: true, columnId: true },
    });
    await compactColumnPositions(tx, task.columnId);
    return deleted;
  });
};

export const moveTask = async (
  workspaceId: string,
  boardId: string,
  taskId: string,
  userId: string,
  input: MoveTaskInput,
) => {
  const movedTaskId = await prisma.$transaction(async (tx) => {
    await requireBoardRole(tx, workspaceId, boardId, userId, TASK_WRITE_ROLES, true);
    await ensureColumnBelongsToBoard(tx, boardId, input.targetColumnId);

    const task = await tx.task.findFirst({
      where: { id: taskId, boardId },
      select: { id: true, columnId: true },
    });
    if (!task) throw new AppError("Task not found", 404);

    const sourceTasks = await tx.task.findMany({
      where: { columnId: task.columnId, id: { not: taskId } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });

    const sameColumn = task.columnId === input.targetColumnId;
    const targetTasks = sameColumn
      ? sourceTasks
      : await tx.task.findMany({
        where: { columnId: input.targetColumnId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      });

    if (input.position > targetTasks.length) {
      throw new AppError(
        `Position must be between 0 and ${targetTasks.length}`,
        400,
      );
    }

    const reorderedTarget = [...targetTasks];
    reorderedTarget.splice(input.position, 0, { id: taskId });

    if (!sameColumn) {
      await tx.task.update({
        where: { id: taskId },
        data: { columnId: input.targetColumnId },
      });
      for (const [position, item] of sourceTasks.entries()) {
        await tx.task.update({ where: { id: item.id }, data: { position } });
      }
    }

    for (const [position, item] of reorderedTarget.entries()) {
      await tx.task.update({
        where: { id: item.id },
        data: { position },
      });
    }

    return taskId;
  });

  const task = await prisma.task.findUnique({
    where: { id: movedTaskId },
    include: taskInclude,
  });
  if (!task) throw new AppError("Task not found", 404);
  return task;
};

export const reorderTasks = async (
  workspaceId: string,
  boardId: string,
  columnId: string,
  userId: string,
  input: ReorderTasksInput,
) => {
  const reorderedTaskIds = await prisma.$transaction(async (tx) => {
    await requireBoardRole(tx, workspaceId, boardId, userId, TASK_WRITE_ROLES, true);
    await ensureColumnBelongsToBoard(tx, boardId, columnId);

    const existingTasks = await tx.task.findMany({
      where: { boardId, columnId },
      select: { id: true },
    });
    const existingIds = new Set(existingTasks.map((task) => task.id));
    const requestedIds = new Set(input.taskIds);

    if (
      existingIds.size !== requestedIds.size ||
      !input.taskIds.every((id) => existingIds.has(id))
    ) {
      throw new AppError(
        "Please provide all task IDs belonging to this column exactly once",
        400,
      );
    }

    for (const [position, id] of input.taskIds.entries()) {
      await tx.task.update({ where: { id }, data: { position } });
    }

    return input.taskIds;
  });

  if (reorderedTaskIds.length === 0) return [];

  const tasks = await prisma.task.findMany({
    where: {
      boardId,
      columnId,
      id: { in: reorderedTaskIds },
    },
    include: taskInclude,
  });

  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  return reorderedTaskIds.map((id) => {
    const task = tasksById.get(id);
    if (!task) throw new AppError("Task not found after reordering", 404);
    return task;
  });
};
