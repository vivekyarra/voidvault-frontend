import type { ReactNode } from "react";
import type { DashboardTab } from "./types";
import {
  AdviceIcon,
  BellIcon,
  ChatIcon,
  FollowIcon,
  HomeIcon,
  PlusIcon,
  ProfileIcon,
  SearchIcon,
} from "./icons";

const DESKTOP_NAV_ITEMS: Array<{
  id: DashboardTab;
  label: string;
  icon: ReactNode;
}> = [
  { id: "home", label: "Home", icon: <HomeIcon /> },
  { id: "search", label: "Search", icon: <SearchIcon /> },
  { id: "notifications", label: "Notifications", icon: <BellIcon /> },
  { id: "advice", label: "Advice", icon: <AdviceIcon /> },
  { id: "chat", label: "Chat", icon: <ChatIcon /> },
  { id: "follow", label: "Follow", icon: <FollowIcon /> },
  { id: "profile", label: "Profile", icon: <ProfileIcon /> },
];

export function SideNav({
  activeTab,
  onSelectTab,
  onOpenComposer,
  showNotificationDot = false,
}: {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenComposer: () => void;
  showNotificationDot?: boolean;
}) {
  return (
    <>
      <aside className="dashboard-sidebar">
        <button
          className="dashboard-brand"
          type="button"
          onClick={() => onSelectTab("home")}
        >
          <img
            alt="VoidVault"
            className="dashboard-brand-mark"
            src="/voidvault-logo.svg"
          />
          <span className="dashboard-brand-wordmark">VOIDVAULT</span>
        </button>
        <nav className="dashboard-nav">
          {DESKTOP_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`dashboard-nav-item ${activeTab === item.id ? "active" : ""}`.trim()}
              type="button"
              onClick={() => onSelectTab(item.id)}
            >
              <span
                className={`dashboard-nav-icon ${
                  item.id === "notifications" && showNotificationDot
                    ? "has-notification-dot"
                    : ""
                }`}
                aria-hidden="true"
              >
                {item.icon}
                {item.id === "notifications" && showNotificationDot ? (
                  <span className="dashboard-nav-dot" />
                ) : null}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="btn-primary dashboard-post-btn" type="button" onClick={onOpenComposer}>
          + Post
        </button>
      </aside>

      <nav aria-label="Primary" className="dashboard-mobile-tabbar">
        <button
          className={`dashboard-mobile-tab ${activeTab === "home" ? "active" : ""}`}
          type="button"
          onClick={() => onSelectTab("home")}
        >
          <HomeIcon />
          <span>Home</span>
        </button>
        <button
          className={`dashboard-mobile-tab ${activeTab === "search" ? "active" : ""}`}
          type="button"
          onClick={() => onSelectTab("search")}
        >
          <SearchIcon />
          <span>Search</span>
        </button>
        <button
          aria-label="Create post"
          className="dashboard-mobile-post"
          type="button"
          onClick={onOpenComposer}
        >
          <span className="dashboard-mobile-post-icon" aria-hidden="true">
            <PlusIcon />
          </span>
          <span>Post</span>
        </button>
        <button
          className={`dashboard-mobile-tab ${activeTab === "notifications" ? "active" : ""}`}
          type="button"
          onClick={() => onSelectTab("notifications")}
        >
          <span
            className={`dashboard-mobile-tab-icon ${
              showNotificationDot ? "has-notification-dot" : ""
            }`}
          >
            <BellIcon />
            {showNotificationDot ? <span className="dashboard-nav-dot" /> : null}
          </span>
          <span>Notifications</span>
        </button>
        <button
          className={`dashboard-mobile-tab ${activeTab === "profile" ? "active" : ""}`}
          type="button"
          onClick={() => onSelectTab("profile")}
        >
          <ProfileIcon />
          <span>Profile</span>
        </button>
      </nav>
    </>
  );
}
