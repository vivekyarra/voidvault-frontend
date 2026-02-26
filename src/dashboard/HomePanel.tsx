import { type FormEvent, useEffect, useState } from "react";
import { requestJson } from "../api";
import type { CurrentUser, FeedPost, FeedResponse } from "./types";
import { formatDateTime } from "./shared";

export function HomePanel({
  currentUser,
  onOpenProfile,
}: {
  currentUser: CurrentUser;
  onOpenProfile: (userId: string) => void;
}) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [followingOnly, setFollowingOnly] = useState(false);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postChannel, setPostChannel] = useState("general");
  const [postContent, setPostContent] = useState("");
  const [postImageUrl, setPostImageUrl] = useState("");
  const [postImageBlurhash, setPostImageBlurhash] = useState("");

  async function loadFeed(cursor: string | null, append: boolean) {
    const params = new URLSearchParams();
    if (followingOnly) {
      params.set("following_only", "true");
    }
    if (cursor) {
      params.set("cursor", cursor);
    }

    const query = params.toString();
    const path = query ? `/feed?${query}` : "/feed";
    const response = await requestJson<FeedResponse>(path, { method: "GET" });
    setPosts((previous) => (append ? [...previous, ...response.posts] : response.posts));
    setNextCursor(response.nextCursor);
  }

  async function refreshFeed() {
    setStatus("");
    setIsLoading(true);
    try {
      await loadFeed(null, false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load feed");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshFeed();
  }, [followingOnly]);

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setIsPosting(true);

    try {
      const payload: Record<string, unknown> = {
        channel: postChannel,
        content: postContent,
      };
      if (postImageUrl.trim()) {
        payload.image_url = postImageUrl.trim();
      }
      if (postImageBlurhash.trim()) {
        payload.image_blurhash = postImageBlurhash.trim();
      }

      await requestJson<{ post: { id: string } }>("/post", {
        method: "POST",
        body: payload,
      });

      setPostContent("");
      setPostImageUrl("");
      setPostImageBlurhash("");
      setStatus("Post published.");
      await refreshFeed();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to publish");
    } finally {
      setIsPosting(false);
    }
  }

  async function handleReport(postId: string) {
    try {
      await requestJson<{ success: boolean }>("/report", {
        method: "POST",
        body: { content_type: "post", content_id: postId },
      });
      setStatus("Post reported.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to report post");
    }
  }

  async function handleDelete(postId: string) {
    try {
      await requestJson<{ success: boolean }>("/post", {
        method: "DELETE",
        body: { post_id: postId },
      });
      setPosts((previous) => previous.filter((post) => post.id !== postId));
      setStatus("Post deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to delete post");
    }
  }

  return (
    <section className="dashboard-panel">
      <header className="panel-header">
        <h2>Home</h2>
        <div className="tab-toggle">
          <button
            className={!followingOnly ? "active" : ""}
            type="button"
            onClick={() => setFollowingOnly(false)}
          >
            For you
          </button>
          <button
            className={followingOnly ? "active" : ""}
            type="button"
            onClick={() => setFollowingOnly(true)}
          >
            Following
          </button>
        </div>
      </header>

      <form className="composer" onSubmit={handleCreatePost}>
        <input
          maxLength={32}
          placeholder="channel"
          required
          type="text"
          value={postChannel}
          onChange={(event) => setPostChannel(event.target.value)}
        />
        <textarea
          maxLength={500}
          placeholder="What's happening?"
          required
          rows={4}
          value={postContent}
          onChange={(event) => setPostContent(event.target.value)}
        />
        <input
          placeholder="Cloudinary image URL (optional)"
          type="url"
          value={postImageUrl}
          onChange={(event) => setPostImageUrl(event.target.value)}
        />
        <input
          maxLength={200}
          placeholder="Image blurhash (optional)"
          type="text"
          value={postImageBlurhash}
          onChange={(event) => setPostImageBlurhash(event.target.value)}
        />
        <button disabled={isPosting} type="submit">
          {isPosting ? "Posting..." : "Post"}
        </button>
      </form>

      {status ? <p className="panel-status">{status}</p> : null}
      {isLoading ? <p className="empty-state">Loading feed...</p> : null}

      {!isLoading && posts.length === 0 ? (
        <p className="empty-state">No content uploaded yet.</p>
      ) : null}

      <div className="card-list">
        {posts.map((post) => (
          <article className="content-card" key={post.id}>
            <header>
              <button
                className="inline-link"
                type="button"
                onClick={() => onOpenProfile(post.user_id)}
              >
                @{post.username}
              </button>
              <span>#{post.channel}</span>
              <time dateTime={post.created_at}>{formatDateTime(post.created_at)}</time>
            </header>
            <p>{post.content}</p>
            {post.image_url ? (
              <a href={post.image_url} rel="noreferrer" target="_blank">
                View image
              </a>
            ) : null}
            <footer>
              <button type="button" onClick={() => void handleReport(post.id)}>
                Report
              </button>
              {post.user_id === currentUser.id ? (
                <button className="danger" type="button" onClick={() => void handleDelete(post.id)}>
                  Delete
                </button>
              ) : null}
            </footer>
          </article>
        ))}
      </div>

      {nextCursor ? (
        <button className="secondary-btn" type="button" onClick={() => void loadFeed(nextCursor, true)}>
          Load more
        </button>
      ) : null}
    </section>
  );
}
