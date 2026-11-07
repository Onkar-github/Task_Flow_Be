import argon2 from "argon2";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import type { RegisterInput } from "./auth.validation.js";
import type { LoginInput } from "./login.validation.js";

export const registerUser = async (input: RegisterInput) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new AppError(
      "An account with this email already exists",
      409,
    );
  }

  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
  });

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  return user;
};

export const authenticateUser = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  // Use the same response for an unknown email and incorrect password.
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await argon2.verify(
    user.passwordHash,
    input.password,
  );

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
};