import { type FormEvent, useCallback, useEffect, useState } from "react";
import { requestJson } from "../api";
import type { CurrentUser, ProfileResponse } from "./types";
import { LogoutIcon } from "./icons";
import { formatDateTime, sendFollow, sendUnfollow } from "./shared";

interface ProfileUpdateResponse {
  user: {
    id: string;
    username: string;
    created_at: string;
    trust_score: number;
    bio: string | null;
    avatar_url: string | null;
  };
}

interface RecoveryRotationResponse {
  recovery_key: string;
}

export function ProfilePanel({
  currentUser,
  profileUserId,
  onLogout,
  onOpenChat,
}: {
  currentUser: CurrentUser;
  profileUserId: string | null;
  onLogout: () => Promise<void>;
  onOpenChat: (userId: string) => void;
}) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [draftUsername, setDraftUsername] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftAvatarUrl, setDraftAvatarUrl] = useState("");
  const [rotatedRecoveryKey, setRotatedRecoveryKey] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadProfile = useCallback(async () => {
    setStatus("");
    setIsLoading(true);
    try {
      const query = profileUserId ? `?user_id=${encodeURIComponent(profileUserId)}` : "";
      const response = await requestJson<ProfileResponse>(`/profile${query}`, {
        method: "GET",
      });
      setProfile(response);
      setDraftUsername(response.user.username);
      setDraftBio(response.user.bio ?? "");
      setDraftAvatarUrl(response.user.avatar_url ?? "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [profileUserId]);

  useEffect(() => {
    void loadProfile();
  }, [currentUser.id, loadProfile]);

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

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.stats.is_self) {
      return;
    }

    setIsSaving(true);
    setStatus("");
    try {
      await requestJson<ProfileUpdateResponse>("/profile", {
        method: "PATCH",
        body: {
          username: draftUsername,
          bio: draftBio,
          avatar_url: draftAvatarUrl,
        },
      });
      setStatus("Profile updated.");
      await loadProfile();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateAccount() {
    const confirmed = window.confirm("Deactivate your account now?");
    if (!confirmed) {
      return;
    }
    try {
      await requestJson<{ success: boolean }>("/account/deactivate", {
        method: "POST",
      });
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to deactivate account");
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm("Delete your account permanently? This cannot be undone.");
    if (!confirmed) {
      return;
    }
    try {
      await requestJson<{ success: boolean }>("/account", {
        method: "DELETE",
      });
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to delete account");
    }
  }

  async function handleRotateRecoveryKey() {
    const confirmed = window.confirm("Rotate recovery key? Store the new key immediately.");
    if (!confirmed) {
      return;
    }
    try {
      const response = await requestJson<RecoveryRotationResponse>("/account/recovery/rotate", {
        method: "POST",
      });
      setRotatedRecoveryKey(response.recovery_key);
      setStatus("Recovery key rotated. Save it now.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to rotate recovery key");
    }
  }

  async function handleLogoutNow() {
    setIsLoggingOut(true);
    setStatus("");
    try {
      await onLogout();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to logout");
    } finally {
      setIsLoggingOut(false);
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
            {profile.user.bio ? <p>{profile.user.bio}</p> : null}
            {profile.user.avatar_url ? (
              <a href={profile.user.avatar_url} rel="noreferrer" target="_blank">
                View profile image
              </a>
            ) : null}
            <p>
              {profile.stats.posts} posts | {profile.stats.followers} followers | {" "}
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

          {profile.stats.is_self ? (
            <>
              <h3>Edit profile</h3>
              <form className="composer" onSubmit={handleProfileSave}>
                <input
                  maxLength={20}
                  minLength={3}
                  placeholder="username"
                  required
                  type="text"
                  value={draftUsername}
                  onChange={(event) => setDraftUsername(event.target.value)}
                />
                <textarea
                  maxLength={200}
                  placeholder="Bio"
                  rows={3}
                  value={draftBio}
                  onChange={(event) => setDraftBio(event.target.value)}
                />
                <input
                  placeholder="Cloudinary avatar URL"
                  type="url"
                  value={draftAvatarUrl}
                  onChange={(event) => setDraftAvatarUrl(event.target.value)}
                />
                <button disabled={isSaving} type="submit">
                  {isSaving ? "Saving..." : "Save profile"}
                </button>
              </form>

              <div className="card-list">
                <article className="content-card">
                  <header>
                    <strong>Account controls</strong>
                  </header>
                  <footer>
                    <button type="button" onClick={() => void handleRotateRecoveryKey()}>
                      Rotate recovery key
                    </button>
                    <button
                      className="logout-pill"
                      disabled={isLoggingOut}
                      type="button"
                      onClick={() => void handleLogoutNow()}
                    >
                      <LogoutIcon />
                      <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                    </button>
                    <button className="secondary-btn" type="button" onClick={() => void handleDeactivateAccount()}>
                      Deactivate
                    </button>
                    <button className="danger" type="button" onClick={() => void handleDeleteAccount()}>
                      Delete account
                    </button>
                  </footer>
                  {rotatedRecoveryKey ? <p><strong>New key:</strong> {rotatedRecoveryKey}</p> : null}
                </article>
              </div>
            </>
          ) : null}

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

          {profile.stats.is_self ? (
            <>
              <h3>Saved</h3>
              {profile.saved_posts.length === 0 ? (
                <p className="empty-state">No saved posts yet.</p>
              ) : null}
              <div className="card-list">
                {profile.saved_posts.map((post) => (
                  <article className="content-card" key={`saved-${post.id}`}>
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
        </>
      ) : null}
    </section>
  );
}
