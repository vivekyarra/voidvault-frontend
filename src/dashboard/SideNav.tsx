import type { DashboardTab } from "./types";

const NAV_ITEMS: Array<{ id: DashboardTab; label: string; icon: string }> = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "search", label: "Search", icon: "⌕" },
  { id: "notifications", label: "Notifications", icon: "◉" },
  { id: "follow", label: "Follow", icon: "◎" },
  { id: "chat", label: "Chat", icon: "✉" },
  { id: "profile", label: "Profile", icon: "◌" },
];

export function SideNav({
  activeTab,
  onSelectTab,
}: {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
}) {
  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-logo" aria-hidden="true">
        <span>V</span>
        <span className="dashboard-logo-up">V</span>
      </div>
      <nav className="dashboard-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`dashboard-nav-item ${activeTab === item.id ? "active" : ""}`}
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
    </aside>
  );
}
