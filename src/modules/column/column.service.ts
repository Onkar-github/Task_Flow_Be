
import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import { handlePrismaError } from "../../utils/prisma-error.js";
import { requireWorkspaceRole } from "../workspace/workspace.authorization.js";

import type {
    CreateColumnInput,
    UpdateColumnInput,
    ReorderColumnsInput,
} from "./column.validation.js";

const VIEW_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
const MANAGE_ROLES = ["OWNER", "ADMIN"] as const;

// Verify workspace permission and board ownership.
const requireBoardAccess = async (
    tx: Parameters<typeof requireWorkspaceRole>[0],
    userId: string,
    workspaceId: string,
    boardId: string,
    allowedRoles: readonly ("OWNER" | "ADMIN" | "MEMBER" | "VIEWER")[],
) => {
    await requireWorkspaceRole(
        tx,
        userId,
        workspaceId,
        allowedRoles,
    );

    const board = await tx.board.findFirst({
        where: {
            id: boardId,
            workspaceId,
            archivedAt: null,
        },
        select: {
            id: true,
        },
    });

    if (!board) {
        throw new AppError("Board not found", 404);
    }

    return board;
};

// Create a column.
export const createColumn = async (
    workspaceId: string,
    boardId: string,
    userId: string,
    input: CreateColumnInput,
) => {
    return prisma.$transaction(async (tx) => {
        await requireBoardAccess(
            tx,
            userId,
            workspaceId,
            boardId,
            MANAGE_ROLES,
        );

        const lastColumn = await tx.boardColumn.aggregate({
            where: { boardId },
            _max: { position: true },
        });

        const position = (lastColumn._max.position ?? -1) + 1;

        try {
            return await tx.boardColumn.create({
                data: {
                    name: input.name,
                    boardId,
                    position,
                },
                select: {
                    id: true,
                    name: true,
                    boardId: true,
                    position: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        } catch (error) {
            handlePrismaError(error, {
                P2002: {
                    message: "A column with this name already exists in this board",
                    statusCode: 409,
                },
            });
        }
    });
};

// Get all columns in a board.
export const getBoardColumns = async (
    workspaceId: string,
    boardId: string,
    userId: string,
) => {
    return prisma.$transaction(async (tx) => {
        await requireBoardAccess(
            tx,
            userId,
            workspaceId,
            boardId,
            VIEW_ROLES,
        );

        return tx.boardColumn.findMany({
            where: { boardId },
            orderBy: [
                { position: "asc" },
                { createdAt: "asc" },
                { id: "asc" },
            ],
            select: {
                id: true,
                name: true,
                boardId: true,
                position: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    });
};

// Rename a column.
export const updateColumn = async (
    workspaceId: string,
    boardId: string,
    columnId: string,
    userId: string,
    input: UpdateColumnInput,
) => {
    return prisma.$transaction(async (tx) => {
        await requireBoardAccess(
            tx,
            userId,
            workspaceId,
            boardId,
            MANAGE_ROLES,
        );

        const column = await tx.boardColumn.findFirst({
            where: {
                id: columnId,
                boardId,
            },
            select: { id: true },
        });

        if (!column) {
            throw new AppError("Column not found", 404);
        }

        try {
            return await tx.boardColumn.update({
                where: { id: columnId },
                data: { name: input.name },
                select: {
                    id: true,
                    name: true,
                    boardId: true,
                    position: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        } catch (error) {
            handlePrismaError(error, {
                P2002: {
                    message: "A column with this name already exists in this board",
                    statusCode: 409,
                },
            });
        }
    });
};

// Delete a column.

export const deleteColumn = async (
  workspaceId: string,
  boardId: string,
  columnId: string,
  userId: string,
) => {
  return prisma.$transaction(async (tx) => {
    await requireBoardAccess(
      tx,
      userId,
      workspaceId,
      boardId,
      MANAGE_ROLES,
    );

    // Coordinate with task create/move/delete and board deletion.
    // All these operations lock the parent board row first.
    const boardRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "Board"
      WHERE "id" = ${boardId}::uuid
        AND "workspaceId" = ${workspaceId}::uuid
        AND "archivedAt" IS NULL
      FOR UPDATE
    `;

    if (boardRows.length === 0) {
      throw new AppError("Board not found", 404);
    }

    const column = await tx.boardColumn.findFirst({
      where: { id: columnId, boardId },
      select: { id: true, name: true, boardId: true },
    });

    if (!column) {
      throw new AppError("Column not found", 404);
    }

    const taskCount = await tx.task.count({
      where: { boardId, columnId },
    });

    if (taskCount > 0) {
      throw new AppError(
        "Cannot delete a column that contains tasks. Move or delete its tasks first.",
        409,
      );
    }

    const deletedColumn = await tx.boardColumn.delete({
      where: { id: columnId },
      select: { id: true, name: true, boardId: true },
    });

    const remainingColumns = await tx.boardColumn.findMany({
      where: { boardId },
      orderBy: [
        { position: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
      select: { id: true },
    });

    for (const [position, remainingColumn] of remainingColumns.entries()) {
      await tx.boardColumn.update({
        where: { id: remainingColumn.id },
        data: { position },
      });
    }

    return deletedColumn;
  });
};


// Reorder all columns in a board.
export const reorderColumns = async (
    workspaceId: string,
    boardId: string,
    userId: string,
    input: ReorderColumnsInput,
) => {
    return prisma.$transaction(async (tx) => {
        await requireBoardAccess(
            tx,
            userId,
            workspaceId,
            boardId,
            MANAGE_ROLES,
        );

        const existingColumns = await tx.boardColumn.findMany({
            where: { boardId },
            select: { id: true },
        });

        const existingIds = new Set(
            existingColumns.map((column) => column.id),
        );

        const requestedIds = new Set(input.columnIds);

        if (
            existingIds.size !== requestedIds.size ||
            !input.columnIds.every((id) => existingIds.has(id))
        ) {
            throw new AppError(
                "Please provide all column IDs belonging to this board exactly once",
                400,
            );
        }

        for (const [position, columnId] of input.columnIds.entries()) {
            await tx.boardColumn.update({
                where: { id: columnId },
                data: { position },
            });
        }

        return tx.boardColumn.findMany({
            where: { boardId },
            orderBy: { position: "asc" },
            select: {
                id: true,
                name: true,
                boardId: true,
                position: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    });
};
