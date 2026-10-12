import { useState } from "react";
import type { SyntheticEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import styles from "./AuthPages.module.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      navigate("/login", {
        replace: true,
        state: { registrationSuccess: true },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="register-title">
        <div className={styles.heading}>
          <span className={styles.eyebrow}>University Library</span>
          <h1 id="register-title">Create your account</h1>
          <p>Join the library and manage your books in one place.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="register-name">Full name</label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="register-confirm">Confirm password</label>
            <input
              id="register-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
