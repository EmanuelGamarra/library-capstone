import { loginUser, registerUser } from "../services/authService.js";
import { loginSchema, registerSchema } from "../validators/authValidator.js";

function sendValidationError(res, result, message) {
  return res.status(400).json({
    message,
    errors: result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

export async function register(req, res) {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return sendValidationError(res, result, "Invalid registration data");
  }

  const user = await registerUser(result.data);

  return res.status(201).json({
    message: "User registered successfully",
    user,
  });
}

export async function login(req, res) {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return sendValidationError(res, result, "Invalid login data");
  }

  const { user, token } = await loginUser(result.data);

  return res.status(200).json({
    message: "Login successful",
    token,
    user,
  });
}

export function getCurrentUser(req, res) {
  return res.status(200).json({
    user: req.user,
  });
}
