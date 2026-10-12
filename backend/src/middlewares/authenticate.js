import User from "../models/User.js";
import { toPublicUser } from "../services/authService.js";
import { verifyAuthToken } from "../utils/authToken.js";

function sendUnauthorized(res) {
  return res.status(401).json({
    message: "Authentication required",
  });
}

export async function authenticate(req, res, next) {
  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer +(\S+)$/i);
  const token = match?.[1];

  if (!token) {
    return sendUnauthorized(res);
  }

  let payload;

  try {
    payload = verifyAuthToken(token);
  } catch {
    return sendUnauthorized(res);
  }

  const user = await User.findByPk(payload.sub);

  if (!user) {
    return sendUnauthorized(res);
  }

  req.user = toPublicUser(user);
  return next();
}
