
import { z } from "zod";

export const createBoardSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Board name must contain at least 2 characters")
    .max(80, "Board name cannot exceed 80 characters"),

  description: z.string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;

export const updateBoardSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Board name must contain at least 2 characters")
    .max(80, "Board name cannot exceed 80 characters")
    .optional(),

  description: z.string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .nullable()
    .optional(),
}).refine(
  (data) =>
    data.name !== undefined ||
    data.description !== undefined,
  {
    message: "At least one field must be provided",
  },
);

export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
