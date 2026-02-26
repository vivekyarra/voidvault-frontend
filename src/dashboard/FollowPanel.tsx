import { useEffect, useState } from "react";
import { requestJson } from "../api";
import type { FollowDataResponse } from "./types";
import { formatDateTime, sendFollow, sendUnfollow } from "./shared";

export function FollowPanel({
  onOpenChat,
  onOpenProfile,
}: {
  onOpenChat: (userId: string) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const [data, setData] = useState<FollowDataResponse | null>(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadData() {
    setStatus("");
    setIsLoading(true);
    try {
      const response = await requestJson<FollowDataResponse>("/follow", {
        method: "GET",
      });
      setData(response);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load follow data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleFollow(userId: string, shouldUnfollow: boolean) {
    try {
      if (shouldUnfollow) {
        await sendUnfollow(userId);
      } else {
        await sendFollow(userId);
      }
      await loadData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Follow action failed");
    }
  }

  return (
    <section className="dashboard-panel">
      <header className="panel-header">
        <h2>Follow</h2>
        <button className="secondary-btn" type="button" onClick={() => void loadData()}>
          Refresh
        </button>
      </header>

      {status ? <p className="panel-status">{status}</p> : null}
      {isLoading ? <p className="empty-state">Loading follow data...</p> : null}

      {!isLoading && data ? (
        <>
          <h3>Who to follow</h3>
          {data.suggestions.length === 0 ? (
            <p className="empty-state">No suggestions available.</p>
          ) : null}
          <div className="card-list">
            {data.suggestions.map((user) => (
              <article className="content-card" key={user.id}>
                <header>
                  <button
                    className="inline-link"
                    type="button"
                    onClick={() => onOpenProfile(user.id)}
                  >
                    @{user.username}
                  </button>
                </header>
                <footer>
                  <button type="button" onClick={() => void handleFollow(user.id, false)}>
                    Follow
                  </button>
                  <button type="button" onClick={() => onOpenChat(user.id)}>
                    Chat
                  </button>
                </footer>
              </article>
            ))}
          </div>

          <h3>Following</h3>
          {data.following.length === 0 ? (
            <p className="empty-state">You are not following anyone yet.</p>
          ) : null}
          <div className="card-list">
            {data.following.map((user) => (
              <article className="content-card" key={user.id}>
                <header>
                  <button
                    className="inline-link"
                    type="button"
                    onClick={() => onOpenProfile(user.id)}
                  >
                    @{user.username}
                  </button>
                  <time dateTime={user.followed_at}>{formatDateTime(user.followed_at)}</time>
                </header>
                <footer>
                  <button type="button" onClick={() => void handleFollow(user.id, true)}>
                    Unfollow
                  </button>
                  <button type="button" onClick={() => onOpenChat(user.id)}>
                    Chat
                  </button>
                </footer>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
