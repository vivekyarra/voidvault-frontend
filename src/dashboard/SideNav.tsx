import type { ReactNode } from "react";
import type { DashboardTab } from "./types";
import {
  AdviceIcon,
  BellIcon,
  ChatIcon,
  FollowIcon,
  HomeIcon,
  ProfileIcon,
  SearchIcon,
} from "./icons";

const NAV_ITEMS: Array<{
  id: DashboardTab;
  label: string;
  icon: ReactNode;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
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
        {NAV_ITEMS.map((item) => (
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
  );
}
