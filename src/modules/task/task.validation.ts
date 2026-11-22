import { z } from "zod";

const taskTitleSchema = z
  .string()
  .trim()
  .min(2, "Task title must contain at least 2 characters")
  .max(150, "Task title cannot exceed 150 characters");

const descriptionSchema = z
  .string()
  .trim()
  .max(5000, "Task description cannot exceed 5000 characters")
  .nullable();

const dueDateSchema = z.iso.datetime({
  offset: true,
  error: "Due date must be a valid ISO 8601 datetime with timezone",
}).nullable();

export const createTaskSchema = z
  .object({
    title: taskTitleSchema,
    description: descriptionSchema.optional(),
    columnId: z.uuid({ error: "Invalid column ID" }),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    assigneeId: z.uuid({ error: "Invalid assignee ID" }).nullable().optional(),
    dueDate: dueDateSchema.optional(),
  })
  .strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: taskTitleSchema.optional(),
    description: descriptionSchema.optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    assigneeId: z.uuid({ error: "Invalid assignee ID" }).nullable().optional(),
    dueDate: dueDateSchema.optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const moveTaskSchema = z
  .object({
    targetColumnId: z.uuid({ error: "Invalid target column ID" }),
    position: z.number().int().min(0, "Position cannot be negative"),
  })
  .strict();

export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

export const reorderTasksSchema = z
  .object({
    taskIds: z.array(z.uuid({ error: "Invalid task ID" })).min(1, "At least one task ID is required"),
  })
  .strict()
  .refine((data) => new Set(data.taskIds).size === data.taskIds.length, {
    message: "Duplicate task IDs are not allowed",
    path: ["taskIds"],
  });

export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;
