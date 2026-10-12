import argon2 from "argon2";
import { UniqueConstraintError } from "sequelize";
import User from "../models/User.js";
import { signAuthToken } from "../utils/authToken.js";

function createInvalidCredentialsError() {
  const error = new Error("Invalid email or password");
  error.statusCode = 401;
  return error;
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export async function registerUser({ name, email, password }) {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  try {
    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    return toPublicUser(user);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      const conflict = new Error("Email is already registered");
      conflict.statusCode = 409;
      throw conflict;
    }

    throw error;
  }
}

export async function loginUser({ email, password }) {
  const user = await User.scope("withPassword").findOne({
    where: { email },
  });

  if (!user || !(await argon2.verify(user.passwordHash, password))) {
    throw createInvalidCredentialsError();
  }

  return {
    user: toPublicUser(user),
    token: signAuthToken(user.id),
  };
}
