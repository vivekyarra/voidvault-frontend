import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { requestJson } from "../api";
import "./admin.css";

const ADMIN_PANEL_PASSWORD = "vivekbadass";

interface AdminStats {
  total_users: number;
  active_users: number;
  banned_users: number;
  online_users: number;
  total_posts: number;
  hidden_posts: number;
  total_reports: number;
}

interface AdminOverviewResponse {
  stats: AdminStats;
}

interface AdminUser {
  id: string;
  username: string;
  recovery_key_hash: string;
  created_at: string;
  trust_score: number;
  is_active: boolean;
  is_banned: boolean;
  is_shadow_banned: boolean;
  bio: string | null;
  avatar_url: string | null;
}

interface AdminUsersResponse {
  users: AdminUser[];
}

interface AdminPost {
  id: string;
  user_id: string;
  channel: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  expires_at: string;
  hidden: boolean;
  report_count: number;
  deleted_at: string | null;
}

interface AdminPostsResponse {
  posts: AdminPost[];
}

interface AdminReport {
  id: string;
  content_type: string;
  content_id: string;
  reporter_id: string | null;
  created_at: string;
}

interface AdminReportsResponse {
  reports: AdminReport[];
}

type AdminSection = "users" | "posts" | "reports";

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

export function AdminPanel({
  onNavigateHome,
}: {
  onNavigateHome: () => void;
}) {
  const [typedPassword, setTypedPassword] = useState("");
  const [adminSecret, setAdminSecret] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("users");
  const [loadedSections, setLoadedSections] = useState<Record<AdminSection, boolean>>({
    users: false,
    posts: false,
    reports: false,
  });
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [postQuery, setPostQuery] = useState("");

  const adminRequest = useCallback(
    async <TResponse,>(
      path: string,
      init?: Omit<RequestInit, "body"> & { body?: unknown },
    ): Promise<TResponse> => {
      if (!adminSecret) {
        throw new Error("Admin password is required");
      }
      const headers = new Headers(init?.headers);
      headers.set("X-Admin-Secret", adminSecret);
      return requestJson<TResponse>(path, { ...init, headers });
    },
    [adminSecret],
  );

  const loadOverview = useCallback(async () => {
    const response = await adminRequest<AdminOverviewResponse>("/admin/overview", {
      method: "GET",
    });
    setStats(response.stats);
  }, [adminRequest]);

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("limit", "100");
    if (userQuery.trim()) {
      params.set("q", userQuery.trim());
    }
    const response = await adminRequest<AdminUsersResponse>(
      `/admin/users?${params.toString()}`,
      { method: "GET" },
    );
    setUsers(response.users);
    setLoadedSections((previous) => ({ ...previous, users: true }));
  }, [adminRequest, userQuery]);

  const loadPosts = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("limit", "100");
    params.set("include_hidden", "true");
    if (postQuery.trim()) {
      params.set("q", postQuery.trim());
    }
    const response = await adminRequest<AdminPostsResponse>(
      `/admin/posts?${params.toString()}`,
      { method: "GET" },
    );
    setPosts(response.posts);
    setLoadedSections((previous) => ({ ...previous, posts: true }));
  }, [adminRequest, postQuery]);

  const loadReports = useCallback(async () => {
    const response = await adminRequest<AdminReportsResponse>("/admin/reports?limit=100", {
      method: "GET",
    });
    setReports(response.reports);
    setLoadedSections((previous) => ({ ...previous, reports: true }));
  }, [adminRequest]);

  const loadActiveSection = useCallback(async () => {
    if (activeSection === "users") {
      await loadUsers();
      return;
    }
    if (activeSection === "posts") {
      await loadPosts();
      return;
    }
    await loadReports();
  }, [activeSection, loadPosts, loadReports, loadUsers]);

  const refreshCurrentView = useCallback(async () => {
    setStatus("");
    setIsLoading(true);
    try {
      await Promise.all([loadOverview(), loadActiveSection()]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load admin data");
    } finally {
      setIsLoading(false);
    }
  }, [loadActiveSection, loadOverview]);

  useEffect(() => {
    if (!adminSecret) {
      return;
    }
    void refreshCurrentView();
  }, [adminSecret, refreshCurrentView]);

  useEffect(() => {
    if (!adminSecret || loadedSections[activeSection]) {
      return;
    }
    setIsLoading(true);
    void loadActiveSection()
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : "Failed to load admin data");
      })
      .finally(() => setIsLoading(false));
  }, [activeSection, adminSecret, loadActiveSection, loadedSections]);

  const statsCards = useMemo(
    () => [
      { label: "Total users", value: stats?.total_users ?? 0 },
      { label: "Online now", value: stats?.online_users ?? 0 },
      { label: "Active users", value: stats?.active_users ?? 0 },
      { label: "Banned users", value: stats?.banned_users ?? 0 },
      { label: "Total posts", value: stats?.total_posts ?? 0 },
      { label: "Hidden posts", value: stats?.hidden_posts ?? 0 },
      { label: "Total reports", value: stats?.total_reports ?? 0 },
    ],
    [stats],
  );

  async function handleModeration(
    userId: string,
    updates: {
      is_banned?: boolean;
      is_shadow_banned?: boolean;
    },
  ) {
    setBusyKey(`user:${userId}`);
    setStatus("");
    try {
      await adminRequest<{ success: boolean }>("/admin/user/moderation", {
        method: "POST",
        body: {
          user_id: userId,
          ...updates,
        },
      });
      await Promise.all([loadUsers(), loadOverview()]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to moderate user");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!window.confirm("Delete this user and all related content permanently?")) {
      return;
    }

    setBusyKey(`user-delete:${userId}`);
    setStatus("");
    try {
      await adminRequest<{ success: boolean }>("/admin/user", {
        method: "DELETE",
        body: { user_id: userId },
      });
      const refreshTasks: Array<Promise<unknown>> = [loadUsers(), loadOverview()];
      if (loadedSections.posts) {
        refreshTasks.push(loadPosts());
      }
      if (loadedSections.reports) {
        refreshTasks.push(loadReports());
      }
      await Promise.all(refreshTasks);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleHidePost(postId: string, hidden: boolean) {
    setBusyKey(`post:${postId}`);
    setStatus("");
    try {
      await adminRequest<{ success: boolean }>("/admin/post/hide", {
        method: "POST",
        body: { post_id: postId, hidden },
      });
      await Promise.all([loadPosts(), loadOverview()]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to update post");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!window.confirm("Delete this post permanently?")) {
      return;
    }

    setBusyKey(`post-delete:${postId}`);
    setStatus("");
    try {
      await adminRequest<{ success: boolean }>("/admin/post/delete", {
        method: "POST",
        body: { post_id: postId },
      });
      const refreshTasks: Array<Promise<unknown>> = [loadPosts(), loadOverview()];
      if (loadedSections.reports) {
        refreshTasks.push(loadReports());
      }
      await Promise.all(refreshTasks);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to delete post");
    } finally {
      setBusyKey(null);
    }
  }

  function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (typedPassword !== ADMIN_PANEL_PASSWORD) {
      setStatus("Invalid admin password");
      return;
    }
    setAdminSecret(typedPassword);
    setStatus("");
  }

  if (!adminSecret) {
    return (
      <main className="admin-page">
        <section className="admin-lock-card">
          <div className="admin-brand">
            <div aria-hidden="true" className="admin-triple-logo">
              <span>V</span>
              <span className="admin-v-up">V</span>
              <span>V</span>
            </div>
            <h1>Vivek&apos;s VoidVault</h1>
          </div>
          <p>Enter admin password to continue.</p>
          <form className="admin-lock-form" onSubmit={handleUnlock}>
            <input
              autoComplete="current-password"
              placeholder="Admin password"
              type="password"
              value={typedPassword}
              onChange={(event) => setTypedPassword(event.target.value)}
            />
            <button type="submit">Unlock</button>
            <button className="ghost" type="button" onClick={onNavigateHome}>
              Back to app
            </button>
          </form>
          {status ? <p className="admin-status">{status}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div className="admin-brand admin-brand-inline">
          <div aria-hidden="true" className="admin-triple-logo">
            <span>V</span>
            <span className="admin-v-up">V</span>
            <span>V</span>
          </div>
          <div>
            <h1>Vivek&apos;s VoidVault</h1>
            <p>Full moderation and platform controls.</p>
          </div>
        </div>
        <div className="admin-topbar-actions">
          <button type="button" onClick={() => void refreshCurrentView()}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            className="ghost"
            type="button"
            onClick={() => {
              setAdminSecret(null);
              setTypedPassword("");
              setLoadedSections({
                users: false,
                posts: false,
                reports: false,
              });
            }}
          >
            Lock
          </button>
          <button className="ghost" type="button" onClick={onNavigateHome}>
            Open app
          </button>
        </div>
      </header>

      {status ? <p className="admin-status">{status}</p> : null}

      <section className="admin-stats-grid">
        {statsCards.map((card) => (
          <article className="admin-stat-card" key={card.label}>
            <h3>{card.label}</h3>
            <p>{card.value}</p>
          </article>
        ))}
      </section>

      <nav aria-label="Admin sections" className="admin-tabs">
        <button
          className={activeSection === "users" ? "active" : ""}
          type="button"
          onClick={() => setActiveSection("users")}
        >
          Users
        </button>
        <button
          className={activeSection === "posts" ? "active" : ""}
          type="button"
          onClick={() => setActiveSection("posts")}
        >
          Posts
        </button>
        <button
          className={activeSection === "reports" ? "active" : ""}
          type="button"
          onClick={() => setActiveSection("reports")}
        >
          Reports
        </button>
      </nav>

      {activeSection === "users" ? (
        <section className="admin-section">
          <header className="admin-section-header">
            <h2>Users</h2>
            <form
              className="admin-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void loadUsers();
              }}
            >
              <input
                placeholder="Search username"
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
              />
              <button type="submit">Search</button>
            </form>
          </header>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Trust</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>@{user.username}</strong>
                      <div className="admin-muted">User ID: {user.id}</div>
                      <div className="admin-muted">Recovery hash: {user.recovery_key_hash}</div>
                    </td>
                    <td>{user.trust_score}</td>
                    <td>
                      {user.is_banned
                        ? "Banned"
                        : user.is_shadow_banned
                          ? "Shadow banned"
                          : user.is_active
                            ? "Active"
                            : "Inactive"}
                    </td>
                    <td>{formatDateTime(user.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          disabled={Boolean(busyKey)}
                          type="button"
                          onClick={() =>
                            void handleModeration(user.id, { is_banned: !user.is_banned })
                          }
                        >
                          {user.is_banned ? "Unban" : "Ban"}
                        </button>
                        <button
                          disabled={Boolean(busyKey)}
                          type="button"
                          onClick={() =>
                            void handleModeration(user.id, {
                              is_shadow_banned: !user.is_shadow_banned,
                            })
                          }
                        >
                          {user.is_shadow_banned ? "Unshadow" : "Shadow ban"}
                        </button>
                        <button
                          className="danger"
                          disabled={Boolean(busyKey)}
                          type="button"
                          onClick={() => void handleDeleteUser(user.id)}
                        >
                          {busyKey === `user-delete:${user.id}` ? "Deleting..." : "Delete user"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeSection === "posts" ? (
        <section className="admin-section">
          <header className="admin-section-header">
            <h2>Posts</h2>
            <form
              className="admin-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void loadPosts();
              }}
            >
              <input
                placeholder="Search post content"
                value={postQuery}
                onChange={(event) => setPostQuery(event.target.value)}
              />
              <button type="submit">Search</button>
            </form>
          </header>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Reports</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <div className="admin-post-text">{post.content}</div>
                      <div className="admin-muted">
                        @{post.user_id} | #{post.channel}
                      </div>
                      <div className="admin-muted">
                        {post.video_url ? "Media: video" : post.image_url ? "Media: image" : "Media: text only"}
                      </div>
                    </td>
                    <td>{post.report_count}</td>
                    <td>{post.hidden ? "Hidden" : "Visible"}</td>
                    <td>{formatDateTime(post.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          disabled={Boolean(busyKey)}
                          type="button"
                          onClick={() => void handleHidePost(post.id, !post.hidden)}
                        >
                          {post.hidden ? "Unhide" : "Hide"}
                        </button>
                        <button
                          className="danger"
                          disabled={Boolean(busyKey)}
                          type="button"
                          onClick={() => void handleDeletePost(post.id)}
                        >
                          {busyKey === `post-delete:${post.id}` ? "Deleting..." : "Delete post"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeSection === "reports" ? (
        <section className="admin-section">
          <header className="admin-section-header">
            <h2>Reports</h2>
          </header>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Content ID</th>
                  <th>Reporter</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.content_type}</td>
                    <td>{report.content_id}</td>
                    <td>{report.reporter_id ?? "anonymous"}</td>
                    <td>{formatDateTime(report.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
