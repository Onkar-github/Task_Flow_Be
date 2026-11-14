
import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().trim()
    .min(2, "Workspace name must contain at least 2 characters")
    .max(80, "Workspace name cannot exceed 80 characters"),
});

export type CreateWorkspaceInput = z.infer<
  typeof createWorkspaceSchema
>;

export const updateWorkspaceSchema = z.object({
  name: z.string().trim()
    .min(2, "Workspace name must contain at least 2 characters")
    .max(80, "Workspace name cannot exceed 80 characters"),
});

export type UpdateWorkspaceInput = z.infer<
  typeof updateWorkspaceSchema
>;

export const addWorkspaceMemberSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export type AddWorkspaceMemberInput = z.infer<
  typeof addWorkspaceMemberSchema
>;

export const updateWorkspaceMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export type UpdateWorkspaceMemberRoleInput = z.infer<
  typeof updateWorkspaceMemberRoleSchema
>;
