import { useEffect, useMemo, useState } from "react";
import type { CurrentUser, DashboardTab } from "./types";
import { SideNav } from "./SideNav";
import { HomePanel } from "./HomePanel";
import { SearchPanel } from "./SearchPanel";
import { NotificationsPanel } from "./NotificationsPanel";
import { FollowPanel } from "./FollowPanel";
import { ChatPanel } from "./ChatPanel";
import { ProfilePanel } from "./ProfilePanel";
import { AdvicePanel } from "./AdvicePanel";
import { ComposePostModal } from "./ComposePostModal";
import { MoonIcon, PlusIcon, SunIcon } from "./icons";
import "./dashboard.css";

const PAGE_META: Record<DashboardTab, { title: string; subtitle?: string }> = {
  home: { title: "Home" },
  search: { title: "Search" },
  notifications: { title: "Notifications" },
  advice: { title: "Advice" },
  chat: { title: "Chat" },
  follow: {
    title: "Discover People",
    subtitle: "People you might want to follow",
  },
  profile: { title: "Profile" },
};

export function Dashboard({
  currentUser,
  onLogout,
  focusedPostId,
  onCurrentUserUpdated,
}: {
  currentUser: CurrentUser;
  onLogout: () => Promise<void>;
  focusedPostId: string | null;
  onCurrentUserUpdated: (user: CurrentUser) => void;
}) {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const persisted = window.localStorage.getItem("vv_theme");
      return persisted === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const [chatTargetUserId, setChatTargetUserId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [feedRefreshNonce, setFeedRefreshNonce] = useState(0);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [globalStatus, setGlobalStatus] = useState("");

  function openProfile(userId: string) {
    setProfileUserId(userId);
    setActiveTab("profile");
  }

  function openChat(userId: string) {
    setChatTargetUserId(userId);
    setActiveTab("chat");
  }

  async function handleLogout() {
    try {
      await onLogout();
    } catch (error) {
      setGlobalStatus(error instanceof Error ? error.message : "Failed to logout");
    }
  }

  useEffect(() => {
    try {
      window.localStorage.setItem("vv_theme", theme);
    } catch {
      // Ignore storage failures.
    }
  }, [theme]);

  const themeLabel = useMemo(
    () => (theme === "dark" ? "Switch to light mode" : "Switch to dark mode"),
    [theme],
  );

  const profileInitial = currentUser.username.slice(0, 1).toUpperCase();
  const pageMeta = PAGE_META[activeTab];

  function openCurrentUserProfile() {
    setProfileUserId(currentUser.id);
    setActiveTab("profile");
  }

  return (
    <main className={`dashboard-shell theme-${theme}`}>
      <header className="dashboard-mobile-header">
        <button
          aria-label="Go to home"
          className="mobile-logo-btn"
          type="button"
          onClick={() => setActiveTab("home")}
        >
          <img alt="VoidVault" className="mobile-brand-mark" src="/voidvault-logo.svg" />
        </button>
        <div className="mobile-page-heading">
          <p className="ui-kicker">@{currentUser.username}</p>
          <h1>{pageMeta.title}</h1>
        </div>
        <div className="mobile-header-actions">
          <button
            aria-label="Open profile"
            className="mobile-profile-chip"
            type="button"
            onClick={openCurrentUserProfile}
          >
            {profileInitial}
          </button>
          <button
            aria-label={themeLabel}
            className="mobile-theme-btn"
            type="button"
            onClick={() => setTheme((previous) => (previous === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <SideNav
        activeTab={activeTab}
        onOpenComposer={() => setIsComposerOpen(true)}
        onSelectTab={setActiveTab}
      />

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-page-heading">
            <h1>{pageMeta.title}</h1>
            {pageMeta.subtitle ? <p>{pageMeta.subtitle}</p> : null}
          </div>
          <div className="dashboard-topbar-actions">
            <button
              aria-label={themeLabel}
              className="theme-toggle-btn"
              type="button"
              onClick={() => setTheme((previous) => (previous === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="dashboard-user-pill"
              type="button"
              onClick={openCurrentUserProfile}
            >
              @{currentUser.username}
            </button>
          </div>
        </header>

        <div className="dashboard-main-content">
          {globalStatus ? <p className="ui-status">{globalStatus}</p> : null}

          {activeTab === "home" ? (
            <HomePanel
              currentUser={currentUser}
              focusedPostId={focusedPostId}
              refreshNonce={feedRefreshNonce}
              onOpenProfile={openProfile}
            />
          ) : null}
          {activeTab === "search" ? (
            <SearchPanel onOpenProfile={openProfile} onOpenChat={openChat} />
          ) : null}
          {activeTab === "notifications" ? <NotificationsPanel /> : null}
          {activeTab === "follow" ? (
            <FollowPanel onOpenChat={openChat} onOpenProfile={openProfile} />
          ) : null}
          {activeTab === "chat" ? (
            <ChatPanel
              currentUser={currentUser}
              chatTargetUserId={chatTargetUserId}
              onChatTargetHandled={() => setChatTargetUserId(null)}
              onOpenProfile={openProfile}
            />
          ) : null}
          {activeTab === "profile" ? (
            <ProfilePanel
              currentUser={currentUser}
              profileUserId={profileUserId}
              onLogout={handleLogout}
              onOpenChat={openChat}
              onCurrentUserUpdated={onCurrentUserUpdated}
            />
          ) : null}
          {activeTab === "advice" ? <AdvicePanel currentUser={currentUser} /> : null}
        </div>
      </section>

      {activeTab === "home" ? (
        <button
          aria-label="Create post"
          className="dashboard-fab"
          type="button"
          onClick={() => setIsComposerOpen(true)}
        >
          <PlusIcon />
        </button>
      ) : null}

      <ComposePostModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onCreated={async () => {
          setFeedRefreshNonce((previous) => previous + 1);
          setActiveTab("home");
        }}
      />
    </main>
  );
}
