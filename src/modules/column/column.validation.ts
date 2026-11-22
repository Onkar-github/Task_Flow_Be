
import { z } from "zod";

export const createColumnSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Column name must contain at least 2 characters")
    .max(50, "Column name cannot exceed 50 characters"),
});

export type CreateColumnInput = z.infer<typeof createColumnSchema>;

export const updateColumnSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Column name must contain at least 2 characters")
      .max(50, "Column name cannot exceed 50 characters")
      .optional(),
  })
  .refine((data) => data.name !== undefined, {
    message: "At least one field must be provided",
  });

export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;

export const reorderColumnsSchema = z
  .object({
    columnIds: z
      .array(z.uuid("Invalid column ID"))
      .min(1, "At least one column ID is required"),
  })
  .refine(
    (data) => new Set(data.columnIds).size === data.columnIds.length,
    {
      message: "Duplicate column IDs are not allowed",
      path: ["columnIds"],
    },
  );

export type ReorderColumnsInput = z.infer<typeof reorderColumnsSchema>;

