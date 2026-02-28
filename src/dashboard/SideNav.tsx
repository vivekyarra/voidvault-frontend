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
  { id: "follow", label: "Follow", icon: <FollowIcon />, desktopOnly: true },
  { id: "profile", label: "Profile", icon: <ProfileIcon />, desktopOnly: true },
];

export function SideNav({
  activeTab,
  onSelectTab,
  onOpenComposer,
  showPostAction,
}: {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenComposer: () => void;
  showPostAction: boolean;
}) {
  return (
    <aside className="dashboard-sidebar">
      <button
        className="dashboard-logo logo-btn"
        type="button"
        onClick={() => onSelectTab("home")}
      >
        <span>V</span>
        <span className="dashboard-logo-up">V</span>
      </button>
      <nav className="dashboard-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`dashboard-nav-item ${activeTab === item.id ? "active" : ""} ${
              item.mobileOnly ? "mobile-only" : ""
            } ${item.desktopOnly ? "desktop-only" : ""}`.trim()}
            type="button"
            onClick={() => onSelectTab(item.id)}
          >
            <span className="dashboard-nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {showPostAction ? (
        <div className="dashboard-sidebar-actions">
          <button
            className="dashboard-nav-item active-action"
            type="button"
            onClick={onOpenComposer}
          >
            <span className="dashboard-nav-icon" aria-hidden="true">
              <PlusIcon />
            </span>
            <span>Post</span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}
