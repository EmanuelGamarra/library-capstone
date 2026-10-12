import jwt from "jsonwebtoken";
import { getJwtSecret, JWT_EXPIRATION_SECONDS } from "../config/auth.js";

const JWT_ALGORITHM = "HS256";

export function signAuthToken(userId) {
  return jwt.sign({}, getJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    subject: String(userId),
    expiresIn: JWT_EXPIRATION_SECONDS,
  });
}

export function verifyAuthToken(token) {
  const payload = jwt.verify(token, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
  });

  if (typeof payload !== "object" || typeof payload.sub !== "string") {
    throw new Error("Invalid authentication token payload");
  }

  return payload;
}
