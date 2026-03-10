import { type FormEvent, type KeyboardEvent, useEffect, useState } from "react";
import { persistSessionToken, requestJson } from "./api";
import { AdminPanel } from "./admin/AdminPanel";
import { RefreshIcon } from "./dashboard/icons";
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

function hasLoggedOutNotice(): boolean {
  return new URLSearchParams(window.location.search).has("logged_out");
}

function clearAuthNotice() {
  if (window.location.pathname !== "/") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  params.delete("logged_out");
  const query = params.toString();
  window.history.replaceState({}, "", query ? `/?${query}` : "/");
}

function setLoggedOutNotice() {
  if (window.location.pathname !== "/") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  params.set("logged_out", "1");
  window.history.replaceState({}, "", `/?${params.toString()}`);
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
        clearAuthNotice();
        setStatus("");
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
        clearAuthNotice();
        setStatus("");
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
    setLoggedOutNotice();
    setCurrentUser(null);
    setUsername("");
    setPassword("");
    setStatus("");
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
          <aside className="brand-panel">
            <div className="auth-brandbar">
              <img alt="VoidVault" className="auth-brand-mark" src="/voidvault-logo.svg" />
              <span>VOIDVAULT</span>
            </div>
          </aside>
          <section className="form-panel">
            <div className="auth-mobile-brand">
              <img alt="VoidVault" className="auth-mobile-brand-mark" src="/voidvault-logo.svg" />
              <span>VOIDVAULT</span>
            </div>
            <div className="auth-form-copy">
              <p className="ui-kicker">Session</p>
              <h1 className="ui-display">LOADING.</h1>
              <p>Checking your account state.</p>
            </div>
          </section>
        </section>
      </main>
    );
  }

  const showLoggedOutNotice = hasLoggedOutNotice();

  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="brand-panel">
          <div className="auth-brandbar">
            <img alt="VoidVault" className="auth-brand-mark" src="/voidvault-logo.svg" />
            <span>VOIDVAULT</span>
          </div>

          <div className="brand-panel-main">
            <img
              alt="VoidVault"
              className="brand-hero-mark"
              src="/voidvault-logo.svg"
            />
            <div className="brand-copy">
              <h1 className="auth-hero-heading">
                <span>THE PRIVATE</span>
                <span>SOCIAL.</span>
              </h1>
              <p className="auth-hero-subtext">
                No email. No phone. No real name. Just a username and password and
                you&apos;re in.
              </p>
            </div>
            <ul className="brand-proof-list">
              <li>No personal data collected</li>
              <li>No ads, no tracking, no selling</li>
              <li>Delete your account instantly, anytime</li>
            </ul>
          </div>

          <footer className="brand-panel-footer">
            <span>&copy; 2026 VoidVault</span>
            <div className="brand-footer-links">
              <button type="button" onClick={() => handleNavigate("/privacy")}>
                Privacy Policy
              </button>
              <span>&middot;</span>
              <button type="button" onClick={() => handleNavigate("/terms")}>
                Terms
              </button>
            </div>
          </footer>
        </aside>

        <section className="form-panel">
          <div className="auth-mobile-brand">
            <img alt="VoidVault" className="auth-mobile-brand-mark" src="/voidvault-logo.svg" />
            <span>VOIDVAULT</span>
          </div>
          <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
            <button
              aria-selected={authMode === "signup"}
              className={authMode === "signup" ? "active" : ""}
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setStatus("");
              }}
            >
              Sign up
            </button>
            <button
              aria-selected={authMode === "login"}
              className={authMode === "login" ? "active" : ""}
              type="button"
              onClick={() => {
                setAuthMode("login");
                setStatus("");
              }}
            >
              Login
            </button>
          </div>

          <div className="auth-form-copy">
            <p className="ui-kicker">{authMode === "signup" ? "Create Account" : "Access"}</p>
            <h1 className="ui-display">
              {authMode === "signup" ? "JOIN TODAY." : "WELCOME BACK."}
            </h1>
            <p>
              {authMode === "signup"
                ? "No personal info needed. Just pick a name."
                : "Your username is your only identity here."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Username</span>
              <input
                autoComplete="username"
                className="field-input"
                maxLength={20}
                minLength={3}
                placeholder="@username"
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
                  <RefreshIcon />
                  {isGeneratingUsername
                    ? "Generating username..."
                    : "Auto-generate username"}
                </span>
              </p>
            ) : null}

            <label className="auth-field">
              <span>Password</span>
              <input
                autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                className="field-input"
                maxLength={128}
                minLength={8}
                placeholder={authMode === "signup" ? "Create a strong password" : "Enter password"}
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <div className="auth-form-actions">
              <button className="btn-primary" disabled={isSubmitting} type="submit">
                {isSubmitting
                  ? "Please wait..."
                  : authMode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </button>
              <button
                className="btn-secondary"
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
                  : "New here? Create an account"}
              </button>
            </div>
          </form>

          <div className="auth-status-stack">
            {showLoggedOutNotice ? (
              <p className="ui-status auth-notice">You were signed out securely.</p>
            ) : null}
            {status ? <p className="ui-status">{status}</p> : null}
          </div>

          <p className="auth-form-footer">
            {authMode === "signup" ? (
              <>
                By continuing you agree to our{" "}
                <button type="button" onClick={() => handleNavigate("/privacy")}>
                  Privacy Policy
                </button>{" "}
                and{" "}
                <button type="button" onClick={() => handleNavigate("/terms")}>
                  Terms
                </button>
                .
              </>
            ) : (
              <>
                Forgot your password? You&apos;ll need to create a new account.
              </>
            )}
          </p>
        </section>
      </section>
    </main>
  );
}
