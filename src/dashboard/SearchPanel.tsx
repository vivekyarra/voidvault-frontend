import { type FormEvent, useEffect, useState } from "react";
import { requestJson } from "../api";
import type { SearchResponse } from "./types";
import { formatDateTime, sendFollow, sendUnfollow } from "./shared";

export function SearchPanel({
  onOpenProfile,
  onOpenChat,
}: {
  onOpenProfile: (userId: string) => void;
  onOpenChat: (userId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function runSearch(searchText: string) {
    setStatus("");
    setIsLoading(true);
    try {
      const encoded = encodeURIComponent(searchText);
      const response = await requestJson<SearchResponse>(`/search?q=${encoded}`, {
        method: "GET",
      });
      setResult(response);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Search failed");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void runSearch("");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(query);
  }

  async function handleFollowAction(userId: string, isFollowing: boolean) {
    try {
      if (isFollowing) {
        await sendUnfollow(userId);
      } else {
        await sendFollow(userId);
      }
      await runSearch(query);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Follow action failed");
    }
  }

  return (
    <section className="dashboard-panel">
      <header className="panel-header">
        <h2>Search</h2>
      </header>

      <form className="search-form" onSubmit={handleSubmit}>
        <input
          placeholder="Search users and posts"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {status ? <p className="panel-status">{status}</p> : null}
      {isLoading ? <p className="empty-state">Searching...</p> : null}

      {!isLoading && result ? (
        <>
          <h3>Users</h3>
          {result.users.length === 0 ? <p className="empty-state">No users found.</p> : null}
          <div className="card-list">
            {result.users.map((user) => (
              <article className="content-card" key={user.id}>
                <header>
                  <button
                    className="inline-link"
                    type="button"
                    onClick={() => onOpenProfile(user.id)}
                  >
                    @{user.username}
                  </button>
                  <time dateTime={user.created_at}>{formatDateTime(user.created_at)}</time>
                </header>
                <footer>
                  <button
                    type="button"
                    onClick={() => void handleFollowAction(user.id, user.is_following)}
                  >
                    {user.is_following ? "Unfollow" : "Follow"}
                  </button>
                  <button type="button" onClick={() => onOpenChat(user.id)}>
                    Chat
                  </button>
                </footer>
              </article>
            ))}
          </div>

          <h3>Posts</h3>
          {result.posts.length === 0 ? <p className="empty-state">No matching posts.</p> : null}
          <div className="card-list">
            {result.posts.map((post) => (
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
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
