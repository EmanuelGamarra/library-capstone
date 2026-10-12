import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import argon2 from "argon2";
import jwt from "jsonwebtoken";

process.env.CLIENT_URL = "http://localhost:5173";
process.env.JWT_SECRET = "test-only-secret-that-is-at-least-32-bytes";

let baseUrl;
let server;
let User;
let originalCreate;
let originalFindByPk;
let originalScope;

const publicUser = {
  id: "f426c45e-df75-4f3f-a1fd-3bfa040c3c34",
  name: "Library User",
  email: "reader@example.com",
  createdAt: new Date("2026-10-11T12:00:00.000Z"),
};

before(async () => {
  const [{ default: app }, { default: UserModel }] = await Promise.all([
    import("../src/app.js"),
    import("../src/models/User.js"),
  ]);

  User = UserModel;
  originalCreate = User.create;
  originalFindByPk = User.findByPk;
  originalScope = User.scope;

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(() => {
  User.create = originalCreate;
  User.findByPk = originalFindByPk;
  User.scope = originalScope;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
}

test("registration still returns the explicit public user DTO", async () => {
  User.create = async ({ name, email, passwordHash }) => ({
    ...publicUser,
    name,
    email,
    passwordHash,
  });

  const response = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: publicUser.name,
      email: "READER@example.com",
      password: "correct-password",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.user.email, publicUser.email);
  assert.equal("passwordHash" in body.user, false);
});

test("valid login returns a signed JWT and a public user", async () => {
  const passwordHash = await argon2.hash("correct-password", {
    type: argon2.argon2id,
  });

  User.scope = () => ({
    findOne: async () => ({ ...publicUser, passwordHash }),
  });

  const response = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "READER@example.com",
      password: "correct-password",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.user.email, publicUser.email);
  assert.equal("passwordHash" in body.user, false);
  assert.equal(typeof body.token, "string");
  assert.equal(response.headers.get("set-cookie"), null);

  const payload = jwt.verify(body.token, process.env.JWT_SECRET, {
    algorithms: ["HS256"],
  });
  assert.equal(payload.sub, publicUser.id);
});

test("unknown email and wrong password return the same generic response", async () => {
  User.scope = () => ({ findOne: async () => null });

  const unknownResponse = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "unknown@example.com",
      password: "wrong-password",
    }),
  });

  const passwordHash = await argon2.hash("correct-password");
  User.scope = () => ({
    findOne: async () => ({ ...publicUser, passwordHash }),
  });

  const wrongPasswordResponse = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: publicUser.email,
      password: "wrong-password",
    }),
  });

  assert.equal(unknownResponse.status, 401);
  assert.equal(wrongPasswordResponse.status, 401);
  assert.deepEqual(
    await unknownResponse.json(),
    await wrongPasswordResponse.json(),
  );
});

test("current-user endpoint resolves the JWT subject through the User model", async () => {
  User.scope = () => ({
    findOne: async () => ({
      ...publicUser,
      passwordHash: await argon2.hash("correct-password"),
    }),
  });

  const loginResponse = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: publicUser.email,
      password: "correct-password",
    }),
  });
  const { token } = await loginResponse.json();

  User.findByPk = async (id) => {
    assert.equal(id, publicUser.id);
    return publicUser;
  };

  const response = await request("/api/auth/me", {
    headers: { authorization: `bEaReR ${token}` },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.user.id, publicUser.id);
  assert.equal("passwordHash" in body.user, false);
});

test("current-user endpoint rejects missing, malformed, invalid, and expired tokens", async () => {
  const missingResponse = await request("/api/auth/me");
  const malformedResponses = await Promise.all([
    request("/api/auth/me", {
      headers: { authorization: "Basic credentials" },
    }),
    request("/api/auth/me", {
      headers: { authorization: "Bearer" },
    }),
    request("/api/auth/me", {
      headers: { authorization: "Bearer first second" },
    }),
  ]);
  const incorrectlySignedToken = jwt.sign(
    {},
    "different-test-secret-that-is-at-least-32-bytes",
    {
      algorithm: "HS256",
      subject: publicUser.id,
      expiresIn: 60,
    },
  );
  const invalidResponse = await request("/api/auth/me", {
    headers: { authorization: `Bearer ${incorrectlySignedToken}` },
  });
  const expiredToken = jwt.sign({}, process.env.JWT_SECRET, {
    algorithm: "HS256",
    subject: publicUser.id,
    expiresIn: -1,
  });
  const expiredResponse = await request("/api/auth/me", {
    headers: { authorization: `Bearer ${expiredToken}` },
  });

  assert.equal(missingResponse.status, 401);
  assert.equal(
    malformedResponses.every((response) => response.status === 401),
    true,
  );
  assert.equal(invalidResponse.status, 401);
  assert.equal(expiredResponse.status, 401);
});
