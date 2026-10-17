import { useState } from "react";
import type { SyntheticEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import styles from "./AuthPages.module.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const location = useLocation();
  const sessionExpired = location.state?.sessionExpired === true;

  const from = location.state?.from;

  const redirectTo = from?.pathname
    ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
    : "/";

  const registrationSuccess = location.state?.registrationSuccess === true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });

      navigate(redirectTo, {
        replace: true,
        state: from?.state ?? null,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.heading}>
          <span className={styles.eyebrow}>University Library</span>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to manage your library account.</p>
        </div>

        {registrationSuccess && (
          <p className={styles.success} role="status">
            Account created successfully. You can now sign in.
          </p>
        )}

        {sessionExpired && (
          <p className={styles.error} role="alert">
            Your session has expired. Please sign in again.
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className={styles.footer}>
          Don't have an account? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
