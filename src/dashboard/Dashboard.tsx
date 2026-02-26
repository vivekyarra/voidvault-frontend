import { useState } from "react";
import type { CurrentUser, DashboardTab } from "./types";
import { SideNav } from "./SideNav";
import { HomePanel } from "./HomePanel";
import { SearchPanel } from "./SearchPanel";
import { NotificationsPanel } from "./NotificationsPanel";
import { FollowPanel } from "./FollowPanel";
import { ChatPanel } from "./ChatPanel";
import { ProfilePanel } from "./ProfilePanel";
import "./dashboard.css";

export function Dashboard({
  currentUser,
  onLogout,
}: {
  currentUser: CurrentUser;
  onLogout: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const [chatTargetUserId, setChatTargetUserId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
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

  return (
    <main className="dashboard-shell">
      <SideNav activeTab={activeTab} onSelectTab={setActiveTab} />

      <section className="dashboard-main">
        <header className="dashboard-main-header">
          <div>
            <h1>VoidVault</h1>
            <p>Signed in as @{currentUser.username}</p>
          </div>
          <button className="secondary-btn" type="button" onClick={() => void handleLogout()}>
            Logout
          </button>
        </header>

        {globalStatus ? <p className="panel-status">{globalStatus}</p> : null}

        {activeTab === "home" ? (
          <HomePanel currentUser={currentUser} onOpenProfile={openProfile} />
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
            onOpenChat={openChat}
          />
        ) : null}
      </section>
    </main>
  );
}
