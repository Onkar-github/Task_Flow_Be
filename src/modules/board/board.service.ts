
import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import { handlePrismaError } from "../../utils/prisma-error.js";
import { requireWorkspaceRole } from "../workspace/workspace.authorization.js";

import type {
  CreateBoardInput,
  UpdateBoardInput,
} from "./board.validation.js";

const VIEW_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
const MANAGE_ROLES = ["OWNER", "ADMIN"] as const;

// 1. Create board
export const createBoard = async (
  workspaceId: string,
  userId: string,
  input: CreateBoardInput,
) => {
  return prisma.$transaction(async (tx) => {
    await requireWorkspaceRole(
      tx,
      userId,
      workspaceId,
      MANAGE_ROLES,
    );

    try {
      return await tx.board.create({
        data: {
          name: input.name,
          description: input.description,
          workspaceId,
          createdById: userId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          workspaceId: true,
          createdById: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      handlePrismaError(error, {
        P2002: {
          message: "A board with this name already exists in this workspace",
          statusCode: 409,
        },
      });
    }
  });
};

// 2. List active boards
export const getWorkspaceBoards = async (
  workspaceId: string,
  userId: string,
) => {
  return prisma.$transaction(async (tx) => {
    await requireWorkspaceRole(
      tx,
      userId,
      workspaceId,
      VIEW_ROLES,
    );

    const boards = await tx.board.findMany({
      where: {
        workspaceId,
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        workspaceId: true,
        createdById: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      boards,
      count: boards.length,
    };
  });
};

// 3. Get board details
export const getBoardById = async (
  workspaceId: string,
  boardId: string,
  userId: string,
) => {
  return prisma.$transaction(async (tx) => {
    await requireWorkspaceRole(
      tx,
      userId,
      workspaceId,
      VIEW_ROLES,
    );

    const board = await tx.board.findFirst({
      where: {
        id: boardId,
        workspaceId,
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        workspaceId: true,
        createdById: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!board) {
      throw new AppError("Board not found", 404);
    }

    return board;
  });
};

// 4. Update board
export const updateBoard = async (
  workspaceId: string,
  boardId: string,
  userId: string,
  input: UpdateBoardInput,
) => {
  return prisma.$transaction(async (tx) => {
    await requireWorkspaceRole(
      tx,
      userId,
      workspaceId,
      MANAGE_ROLES,
    );

  try {
        return await tx.board.update({
          where: {
            id: boardId,
            workspaceId,
            archivedAt: null,
          },
          data: {
            ...input,
          },
          select: {
            id: true,
            name: true,
            description: true,
            workspaceId: true,
            createdById: true,
            archivedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });
  }catch (error) {
  handlePrismaError(error, {
    P2002: {
      message: "A board with this name already exists in this workspace",
      statusCode: 409,
    },
    P2025: {
      message: "Board not found",
      statusCode: 404,
    },
  });
}

  });
};

// 5. Archive board
export const archiveBoard = async (
  workspaceId: string,
  boardId: string,
  userId: string,
) => {
  return prisma.$transaction(async (tx) => {
    await requireWorkspaceRole(
      tx,
      userId,
      workspaceId,
      MANAGE_ROLES,
    );

    const board = await tx.board.findFirst({
      where: {
        id: boardId,
        workspaceId,
      },
      select: {
        id: true,
        archivedAt: true,
      },
    });

    if (!board) {
      throw new AppError("Board not found", 404);
    }

    if (board.archivedAt) {
      throw new AppError("Board is already archived", 409);
    }

    return tx.board.update({
      where: {
        id: boardId,
      },
      data: {
        archivedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        archivedAt: true,
        updatedAt: true,
      },
    });
  });
};

// 6. Restore board
export const restoreBoard = async (
  workspaceId: string,
  boardId: string,
  userId: string,
) => {
  return prisma.$transaction(async (tx) => {
    await requireWorkspaceRole(
      tx,
      userId,
      workspaceId,
      MANAGE_ROLES,
    );

    const board = await tx.board.findFirst({
      where: {
        id: boardId,
        workspaceId,
      },
      select: {
        id: true,
        archivedAt: true,
      },
    });

    if (!board) {
      throw new AppError("Board not found", 404);
    }

    if (!board.archivedAt) {
      throw new AppError("Board is not archived", 409);
    }

    return tx.board.update({
      where: {
        id: boardId,
      },
      data: {
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
        archivedAt: true,
        updatedAt: true,
      },
    });
  });
};

// 7. Permanently delete board (Owner only)
export const deleteBoard = async (
  workspaceId: string,
  boardId: string,
  userId: string,
) => {
  return prisma.$transaction(async (tx) => {
    await requireWorkspaceRole(
      tx,
      userId,
      workspaceId,
      ["OWNER"],
    );

    const board = await tx.board.findFirst({
      where: {
        id: boardId,
        workspaceId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!board) {
      throw new AppError("Board not found", 404);
    }

    await tx.board.delete({
      where: {
        id: boardId,
      },
    });

    return board;
  });
};
