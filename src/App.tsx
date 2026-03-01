import { type FormEvent, type KeyboardEvent, useEffect, useState } from "react";
import { persistSessionToken, requestJson } from "./api";
import { AdminPanel } from "./admin/AdminPanel";
import { Dashboard } from "./dashboard/Dashboard";
import type { CurrentUser } from "./dashboard/types";
import { PrivacyPage, TermsPage } from "./legalPages";
import "./App.css";

type AuthMode = "signup" | "login";
type RoutePath = "/" | "/terms" | "/privacy" | "/admin";

interface RegisterResponse {
  success: boolean;
  session_token?: string;
}

interface UsernameSuggestResponse {
  username: string;
}

interface LoginResponse {
  success: boolean;
  session_token?: string;
}

function getFocusedPostIdFromQuery(): string | null {
  const value = new URLSearchParams(window.location.search).get("post");
  if (!value) {
    return null;
  }

  return /^[0-9a-fA-F-]{36}$/.test(value) ? value : null;
}

function getRoutePath(): RoutePath {
  const pathname = window.location.pathname.toLowerCase();
  if (pathname === "/terms") {
    return "/terms";
  }
  if (pathname === "/privacy") {
    return "/privacy";
  }
  if (pathname === "/admin") {
    return "/admin";
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
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isGeneratingUsername, setIsGeneratingUsername] = useState(false);
  const [focusedPostId, setFocusedPostId] = useState<string | null>(
    getFocusedPostIdFromQuery(),
  );

  useEffect(() => {
    const handlePopState = () => {
      setRoutePath(getRoutePath());
      setFocusedPostId(getFocusedPostIdFromQuery());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const me = await requestJson<CurrentUser>("/me", { method: "GET" });
        setCurrentUser(me);
      } catch {
        persistSessionToken(null);
        setCurrentUser(null);
      } finally {
        setIsBootstrapping(false);
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
            password,
          },
        });
        persistSessionToken(response.session_token ?? null);
        setStatus("Account created.");
        const me = await requestJson<CurrentUser>("/me", { method: "GET" });
        setCurrentUser(me);
      } else {
        const response = await requestJson<LoginResponse>("/login", {
          method: "POST",
          body: {
            username,
            password,
          },
        });
        persistSessionToken(response.session_token ?? null);
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

  async function handleLogout() {
    await requestJson<{ success: boolean }>("/logout", { method: "POST" });
    persistSessionToken(null);
    setCurrentUser(null);
    setStatus("Logged out.");
  }

  async function handleGenerateUsername() {
    setIsGeneratingUsername(true);
    setStatus("");
    try {
      const response = await requestJson<UsernameSuggestResponse>("/username/suggest", {
        method: "GET",
      });
      setUsername(response.username);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to generate username");
    } finally {
      setIsGeneratingUsername(false);
    }
  }

  function handleUsernameSuggestKeydown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isGeneratingUsername && !isSubmitting) {
        void handleGenerateUsername();
      }
    }
  }

  if (routePath === "/terms") {
    return <TermsPage onNavigateHome={() => handleNavigate("/")} />;
  }

  if (routePath === "/privacy") {
    return <PrivacyPage onNavigateHome={() => handleNavigate("/")} />;
  }

  if (routePath === "/admin") {
    return <AdminPanel onNavigateHome={() => handleNavigate("/")} />;
  }

  if (currentUser) {
    return (
      <Dashboard
        currentUser={currentUser}
        focusedPostId={focusedPostId}
        onLogout={handleLogout}
        onCurrentUserUpdated={(nextUser) => setCurrentUser(nextUser)}
      />
    );
  }

  if (isBootstrapping) {
    return (
      <main className="auth-page">
        <section className="auth-layout">
          <section className="form-panel">
            <h1>VoidVault</h1>
            <h2>Loading session...</h2>
          </section>
        </section>
      </main>
    );
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

            {authMode === "signup" ? (
              <p className="username-suggest-line">
                <span
                  className="username-suggest-link"
                  aria-disabled={isGeneratingUsername || isSubmitting}
                  role="button"
                  tabIndex={isGeneratingUsername || isSubmitting ? -1 : 0}
                  onClick={() => {
                    if (!isGeneratingUsername && !isSubmitting) {
                      void handleGenerateUsername();
                    }
                  }}
                  onKeyDown={handleUsernameSuggestKeydown}
                >
                  {isGeneratingUsername
                    ? "Generating username..."
                    : "Auto generate random username?"}
                </span>
              </p>
            ) : null}

            <label>
              <span>Enter password</span>
              <input
                autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                maxLength={128}
                minLength={8}
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

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
