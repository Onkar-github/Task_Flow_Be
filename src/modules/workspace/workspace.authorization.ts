
import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/app-error.js";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export const requireWorkspaceRole = async (
  tx: Prisma.TransactionClient,
  userId: string,
  workspaceId: string,
  allowedRoles: readonly WorkspaceRole[],
) => {
  const membership = await tx.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!membership) {
    throw new AppError("Workspace not found", 404);
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new AppError(
      "You do not have permission to perform this action",
      403,
    );
  }

  return membership;
};
