const JWT_MINIMUM_SECRET_LENGTH = 32;

export const JWT_EXPIRATION_SECONDS = 60 * 60;

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (
    !secret ||
    Buffer.byteLength(secret, "utf8") < JWT_MINIMUM_SECRET_LENGTH
  ) {
    throw new Error(
      `JWT_SECRET must be set to a secret of at least ${JWT_MINIMUM_SECRET_LENGTH} bytes`,
    );
  }

  return secret;
}

export function getClientOrigin() {
  const clientUrl = process.env.CLIENT_URL;

  if (!clientUrl) {
    throw new Error("CLIENT_URL must be set to the frontend origin");
  }

  return clientUrl;
}

export function validateSecurityConfig() {
  getJwtSecret();
  getClientOrigin();
}
