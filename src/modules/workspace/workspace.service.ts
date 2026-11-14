import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import type {
    CreateWorkspaceInput,
    UpdateWorkspaceInput,
    AddWorkspaceMemberInput,
    UpdateWorkspaceMemberRoleInput,
} from "./workspace.validation.js";
import {
  requireWorkspaceRole,
  type WorkspaceRole,
} from "./workspace.authorization.js";


const generateSlugBase = (name: string): string => {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const isUniqueConstraintError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
};

export const createWorkspace = async (
  input: CreateWorkspaceInput,
  userId: string,
) => {
  const slugBase = generateSlugBase(input.name);

  if (!slugBase) {
    throw new AppError(
      "Workspace name must contain at least one English letter or number",
      400,
    );
  }

  // Retry in case another request creates the same slug concurrently.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        let slug = slugBase;
        let suffix = 2;

        while (
          await tx.workspace.findUnique({
            where: { slug },
            select: { id: true },
          })
        ) {
          slug = `${slugBase}-${suffix}`;
          suffix++;
        }

        const workspace = await tx.workspace.create({
          data: {
            name: input.name,
            slug,
            members: {
              create: {
                userId,
                role: "OWNER",
              },
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            members: {
              where: { userId },
              select: {
                role: true,
                joinedAt: true,
              },
            },
          },
        });

        return {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          createdAt: workspace.createdAt,
          role: workspace.members[0]?.role,
          joinedAt: workspace.members[0]?.joinedAt,
        };
      });
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt < 4) {
        continue;
      }

      if (isUniqueConstraintError(error)) {
        throw new AppError(
          "Unable to generate a unique workspace slug. Please try again.",
          409,
        );
      }

      throw error;
    }
  }

  throw new AppError("Unable to create workspace", 500);
};

export const getUserWorkspaces = async (userId: string) => {
  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },

    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,

      members: {
        where: {
          userId,
        },
        select: {
          role: true,
          joinedAt: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    role: workspace.members[0]?.role,
    joinedAt: workspace.members[0]?.joinedAt,
  }));
};

export const getWorkspaceById = async (
  workspaceId: string,
  userId: string,
) => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: {
        some: {
          userId,
        },
      },
    },

    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,

      members: {
        where: {
          userId,
        },
        select: {
          role: true,
          joinedAt: true,
        },
      },
    },
  });

  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    role: workspace.members[0]?.role,
    joinedAt: workspace.members[0]?.joinedAt,
  };
};

export const updateWorkspace = async (
  workspaceId: string,
  userId: string,
  input: UpdateWorkspaceInput,
) => {
  return prisma.$transaction(async (tx) => {
    const membership = await requireWorkspaceRole(
      tx,
      userId,
      workspaceId,
      ["OWNER", "ADMIN"],
    );

    const workspace = await tx.workspace.update({
      where: {
        id: workspaceId,
      },
      data: {
        name: input.name,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...workspace,
      role: membership.role,
    };
  });
};


const ALL_WORKSPACE_ROLES: readonly WorkspaceRole[] = [
  "OWNER",
  "ADMIN",
  "MEMBER",
  "VIEWER",
];

export const getWorkspaceMembers = async (
  workspaceId: string,
  userId: string,
) => {
  return prisma.$transaction(async (tx) => {
    await requireWorkspaceRole(
      tx,
      userId,
      workspaceId,
      ALL_WORKSPACE_ROLES,
    );

    const members = await tx.workspaceMember.findMany({
      where: {
        workspaceId,
      },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    return {
      members,
      count: members.length,
    };
  });
};


export const addWorkspaceMember = async (
  workspaceId: string,
  userId: string,
  input: AddWorkspaceMemberInput,
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const requester = await requireWorkspaceRole(
        tx,
        userId,
        workspaceId,
        ["OWNER", "ADMIN"],
      );

      if (
        requester.role === "ADMIN" &&
        input.role === "ADMIN"
      ) {
        throw new AppError(
          "Only the workspace Owner can assign the Admin role",
          403,
        );
      }

      const user = await tx.user.findUnique({
        where: {
          email: input.email,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!user) {
        throw new AppError(
          "No registered user found with this email",
          404,
        );
      }

      const existingMembership =
        await tx.workspaceMember.findUnique({
          where: {
            userId_workspaceId: {
              userId: user.id,
              workspaceId,
            },
          },
        });

      if (existingMembership) {
        throw new AppError(
          "User is already a member of this workspace",
          409,
        );
      }

      const member = await tx.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId,
          role: input.role,
        },
        select: {
          id: true,
          role: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return member;
    });
  } catch (error) {
    // Handles a concurrent request trying to add the same user.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        "User is already a member of this workspace",
        409,
      );
    }

    throw error;
  }
};


export const updateWorkspaceMemberRole = async (
  workspaceId: string,
  requesterId: string,
  memberId: string,
  input: UpdateWorkspaceMemberRoleInput,
) => {
  return prisma.$transaction(async (tx) => {
    const requester = await requireWorkspaceRole(
      tx,
      requesterId,
      workspaceId,
      ["OWNER", "ADMIN"],
    );

    const targetMember = await tx.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
      select: {
        id: true,
        userId: true,
        role: true,
      },
    });

    if (!targetMember) {
      throw new AppError(
        "Workspace member not found",
        404,
      );
    }

    if (targetMember.userId === requesterId) {
      throw new AppError(
        "You cannot change your own workspace role",
        403,
      );
    }

    if (targetMember.role === "OWNER") {
      throw new AppError(
        "The Owner role cannot be changed through this operation",
        403,
      );
    }

    if (
      requester.role === "ADMIN" &&
      targetMember.role === "ADMIN"
    ) {
      throw new AppError(
        "Admins cannot manage other Admins",
        403,
      );
    }

    if (
      requester.role === "ADMIN" &&
      input.role === "ADMIN"
    ) {
      throw new AppError(
        "Only the workspace Owner can assign the Admin role",
        403,
      );
    }

    const updatedMember = await tx.workspaceMember.update({
      where: {
        id: memberId,
      },
      data: {
        role: input.role,
      },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedMember;
  });
};


export const removeWorkspaceMember = async (
  workspaceId: string,
  requesterId: string,
  memberId: string,
) => {
  return prisma.$transaction(async (tx) => {
    const requester = await requireWorkspaceRole(
      tx,
      requesterId,
      workspaceId,
      ["OWNER", "ADMIN"],
    );

    const targetMember = await tx.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
      select: {
        id: true,
        userId: true,
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!targetMember) {
      throw new AppError(
        "Workspace member not found",
        404,
      );
    }

    if (targetMember.userId === requesterId) {
      throw new AppError(
        "You cannot remove yourself from the workspace",
        403,
      );
    }

    if (targetMember.role === "OWNER") {
      throw new AppError(
        "The workspace Owner cannot be removed",
        403,
      );
    }

    if (
      requester.role === "ADMIN" &&
      targetMember.role === "ADMIN"
    ) {
      throw new AppError(
        "Admins cannot remove other Admins",
        403,
      );
    }

    await tx.workspaceMember.delete({
      where: {
        id: memberId,
      },
    });

    return {
      removedMember: targetMember,
    };
  });
};

