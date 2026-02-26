import { useEffect, useState } from "react";
import { requestJson } from "../api";
import type { NotificationItem, NotificationsResponse } from "./types";
import { formatDateTime } from "./shared";

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadNotifications() {
    setStatus("");
    setIsLoading(true);
    try {
      const response = await requestJson<NotificationsResponse>("/notifications", {
        method: "GET",
      });
      setNotifications(response.notifications);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  return (
    <section className="dashboard-panel">
      <header className="panel-header">
        <h2>Notifications</h2>
        <button className="secondary-btn" type="button" onClick={() => void loadNotifications()}>
          Refresh
        </button>
      </header>

      {status ? <p className="panel-status">{status}</p> : null}
      {isLoading ? <p className="empty-state">Loading notifications...</p> : null}

      {!isLoading && notifications.length === 0 ? (
        <p className="empty-state">No notifications yet.</p>
      ) : null}

      <div className="card-list">
        {notifications.map((item) => (
          <article className="content-card" key={item.id}>
            <header>
              <strong>{item.title}</strong>
              <time dateTime={item.created_at}>{formatDateTime(item.created_at)}</time>
            </header>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
