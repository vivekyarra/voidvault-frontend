import { type FormEvent, useEffect, useState } from "react";
import { requestJson } from "./api";
import { Dashboard } from "./dashboard/Dashboard";
import type { CurrentUser } from "./dashboard/types";
import { PrivacyPage, TermsPage } from "./legalPages";
import "./App.css";

type AuthMode = "signup" | "login";
type RoutePath = "/" | "/terms" | "/privacy";

interface RegisterResponse {
  recovery_key: string;
}

function getRoutePath(): RoutePath {
  const pathname = window.location.pathname.toLowerCase();
  if (pathname === "/terms") {
    return "/terms";
  }
  if (pathname === "/privacy") {
    return "/privacy";
  }
  return "/";
}

function navigate(path: RoutePath) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }
}

export default function App() {
  const [routePath, setRoutePath] = useState<RoutePath>(getRoutePath());
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [username, setUsername] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [issuedRecoveryKey, setIssuedRecoveryKey] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setRoutePath(getRoutePath());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const me = await requestJson<CurrentUser>("/me", { method: "GET" });
        setCurrentUser(me);
        setUsername((previous) => previous || me.username);
      } catch {
        setCurrentUser(null);
      }
    }
    void loadCurrentUser();
  }, []);

  function handleNavigate(path: RoutePath) {
    navigate(path);
    setRoutePath(path);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    try {
      if (authMode === "signup") {
        const response = await requestJson<RegisterResponse>("/register", {
          method: "POST",
          body: {
            username,
          },
        });
        setIssuedRecoveryKey(response.recovery_key);
        setStatus("Account created. Save your recovery key right now.");
        const me = await requestJson<CurrentUser>("/me", { method: "GET" });
        setCurrentUser(me);
      } else {
        await requestJson<{ success: boolean }>("/login", {
          method: "POST",
          body: {
            recovery_key: recoveryKey,
          },
        });
        setStatus("Signed in successfully.");
        const me = await requestJson<CurrentUser>("/me", { method: "GET" });
        setCurrentUser(me);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyRecoveryKey() {
    if (!issuedRecoveryKey) {
      return;
    }
    await navigator.clipboard.writeText(issuedRecoveryKey);
    setStatus("Recovery key copied to clipboard.");
  }

  async function handleLogout() {
    await requestJson<{ success: boolean }>("/logout", { method: "POST" });
    setCurrentUser(null);
    setStatus("Logged out.");
  }

  if (routePath === "/terms") {
    return <TermsPage onNavigateHome={() => handleNavigate("/")} />;
  }

  if (routePath === "/privacy") {
    return <PrivacyPage onNavigateHome={() => handleNavigate("/")} />;
  }

  if (currentUser) {
    return <Dashboard currentUser={currentUser} onLogout={handleLogout} />;
  }

  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="brand-panel">
          <div aria-hidden="true" className="vault-logo">
            <span>V</span>
            <span className="upward-v">V</span>
          </div>
          <p className="brand-subline">
            Post, connect, and message anonymously in a secure network without
            sacrificing privacy.
          </p>
        </aside>

        <section className="form-panel">
          <h1>Happening now</h1>
          <h2>{authMode === "signup" ? "Join today." : "Sign in."}</h2>

          <form className="auth-form" onSubmit={handleSubmit}>
            {authMode === "signup" ? (
              <label>
                <span>Enter username</span>
                <input
                  autoComplete="username"
                  maxLength={20}
                  minLength={3}
                  required
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>
            ) : null}

            {authMode === "login" ? (
              <label>
                <span>Enter recovery key</span>
                <input
                  autoComplete="off"
                  required
                  type="password"
                  value={recoveryKey}
                  onChange={(event) => setRecoveryKey(event.target.value)}
                />
              </label>
            ) : null}

            <button disabled={isSubmitting} type="submit">
              {isSubmitting
                ? "Please wait..."
                : authMode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p className="agreement-text">
            By continuing, you agree to the{" "}
            <button type="button" onClick={() => handleNavigate("/terms")}>
              Terms of Service
            </button>{" "}
            and{" "}
            <button type="button" onClick={() => handleNavigate("/privacy")}>
              Privacy Policy
            </button>
            , including Cookie Use.
          </p>

          <button
            className="toggle-mode"
            type="button"
            onClick={() => {
              setAuthMode((previous) =>
                previous === "signup" ? "login" : "signup",
              );
              setStatus("");
            }}
          >
            {authMode === "signup"
              ? "Already have an account?"
              : "Need a new account?"}
          </button>

          {issuedRecoveryKey ? (
            <div className="recovery-box">
              <h3>Recovery key</h3>
              <code>{issuedRecoveryKey}</code>
              <button type="button" onClick={() => void handleCopyRecoveryKey()}>
                Copy recovery key
              </button>
            </div>
          ) : null}

          {status ? <p className="status-text">{status}</p> : null}
        </section>
      </section>

      <footer className="site-footer">
        <button type="button" onClick={() => handleNavigate("/terms")}>
          Terms of Service
        </button>
        <button type="button" onClick={() => handleNavigate("/privacy")}>
          Privacy Policy, including Cookie Use
        </button>
        <a
          href="https://yarra-vivek-portfolio.vivekyarra567.workers.dev/"
          rel="noreferrer"
          target="_blank"
        >
          Founder
        </a>
        <span>(c) 2026 voidvaultcorp</span>
      </footer>
    </main>
  );
}
