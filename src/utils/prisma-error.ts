import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "./app-error.js";

export const handlePrismaError = (
  error: unknown,
  messages: Record<string, { message: string; statusCode: number }>,
): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mappedError = messages[error.code];

    if (mappedError) {
      throw new AppError(
        mappedError.message,
        mappedError.statusCode,
      );
    }
  }

  throw error;
};