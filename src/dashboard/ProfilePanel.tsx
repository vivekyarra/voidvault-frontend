import { useEffect, useState } from "react";
import { requestJson } from "../api";
import type { CurrentUser, ProfileResponse } from "./types";
import { formatDateTime, sendFollow, sendUnfollow } from "./shared";

export function ProfilePanel({
  currentUser,
  profileUserId,
  onOpenChat,
}: {
  currentUser: CurrentUser;
  profileUserId: string | null;
  onOpenChat: (userId: string) => void;
}) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadProfile() {
    setStatus("");
    setIsLoading(true);
    try {
      const query = profileUserId ? `?user_id=${encodeURIComponent(profileUserId)}` : "";
      const response = await requestJson<ProfileResponse>(`/profile${query}`, {
        method: "GET",
      });
      setProfile(response);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, [profileUserId, currentUser.id]);

  async function handleFollowToggle() {
    if (!profile || profile.stats.is_self) {
      return;
    }
    try {
      if (profile.stats.is_following) {
        await sendUnfollow(profile.user.id);
      } else {
        await sendFollow(profile.user.id);
      }
      await loadProfile();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to update follow");
    }
  }

  return (
    <section className="dashboard-panel">
      <header className="panel-header">
        <h2>Profile</h2>
        <button className="secondary-btn" type="button" onClick={() => void loadProfile()}>
          Refresh
        </button>
      </header>

      {status ? <p className="panel-status">{status}</p> : null}
      {isLoading ? <p className="empty-state">Loading profile...</p> : null}

      {!isLoading && profile ? (
        <>
          <article className="content-card">
            <header>
              <strong>@{profile.user.username}</strong>
              <span>Trust: {profile.user.trust_score}</span>
            </header>
            <p>Joined: {formatDateTime(profile.user.created_at)}</p>
            <p>
              {profile.stats.posts} posts · {profile.stats.followers} followers ·{" "}
              {profile.stats.following} following
            </p>
            {!profile.stats.is_self ? (
              <footer>
                <button type="button" onClick={() => void handleFollowToggle()}>
                  {profile.stats.is_following ? "Unfollow" : "Follow"}
                </button>
                <button type="button" onClick={() => onOpenChat(profile.user.id)}>
                  Chat
                </button>
              </footer>
            ) : null}
          </article>

          <h3>Posts</h3>
          {profile.posts.length === 0 ? (
            <p className="empty-state">No content uploaded yet.</p>
          ) : null}
          <div className="card-list">
            {profile.posts.map((post) => (
              <article className="content-card" key={post.id}>
                <header>
                  <span>#{post.channel}</span>
                  <time dateTime={post.created_at}>{formatDateTime(post.created_at)}</time>
                </header>
                <p>{post.content}</p>
                {post.image_url ? (
                  <a href={post.image_url} rel="noreferrer" target="_blank">
                    View image
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
