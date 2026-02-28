import { useCallback, useEffect, useMemo, useState } from "react";
import { requestJson } from "../api";
import type {
  CurrentUser,
  FeedPost,
  FeedResponse,
  PostComment,
  PostCommentsResponse,
} from "./types";
import {
  AlertIcon,
  BookmarkIcon,
  CommentIcon,
  ShareIcon,
  ThumbDownIcon,
  ThumbUpIcon,
} from "./icons";
import { formatDateTime } from "./shared";

interface PostLookupResponse {
  post: FeedPost;
}

interface EngagementResponse {
  success: boolean;
  engagement: FeedPost["engagement"];
}

interface CommentCreateResponse {
  comment: PostComment;
}

export function HomePanel({
  currentUser,
  focusedPostId,
  refreshNonce,
  onOpenProfile,
}: {
  currentUser: CurrentUser;
  focusedPostId: string | null;
  refreshNonce: number;
  onOpenProfile: (userId: string) => void;
}) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [highlightedPost, setHighlightedPost] = useState<FeedPost | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [followingOnly, setFollowingOnly] = useState(false);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [openCommentsFor, setOpenCommentsFor] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [commentDraftByPost, setCommentDraftByPost] = useState<Record<string, string>>({});

  const loadFeed = useCallback(
    async (cursor: string | null, append: boolean) => {
      const params = new URLSearchParams();
      if (followingOnly) {
        params.set("following_only", "true");
      }
      params.set("limit", "20");
      if (cursor) {
        params.set("cursor", cursor);
      }

      const query = params.toString();
      const path = query ? `/feed?${query}` : "/feed";
      const response = await requestJson<FeedResponse>(path, { method: "GET" });
      setPosts((previous) => (append ? [...previous, ...response.posts] : response.posts));
      setNextCursor(response.nextCursor);
    },
    [followingOnly],
  );

  const refreshFeed = useCallback(async () => {
    setStatus("");
    setIsLoading(true);
    try {
      await loadFeed(null, false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load feed");
    } finally {
      setIsLoading(false);
    }
  }, [loadFeed]);

  const loadFocusedPost = useCallback(async (postId: string) => {
    try {
      const response = await requestJson<PostLookupResponse>(`/post/${postId}`, {
        method: "GET",
      });
      setHighlightedPost(response.post);
    } catch {
      setHighlightedPost(null);
    }
  }, []);

  useEffect(() => {
    void refreshFeed();
  }, [refreshFeed, refreshNonce]);

  useEffect(() => {
    if (!focusedPostId) {
      setHighlightedPost(null);
      return;
    }
    void loadFocusedPost(focusedPostId);
  }, [focusedPostId, loadFocusedPost, refreshNonce]);

  async function applyReaction(post: FeedPost, reaction: "like" | "dislike") {
    const isSameReaction = post.engagement?.myReaction === reaction;

    try {
      const response = isSameReaction
        ? await requestJson<EngagementResponse>(`/post/${post.id}/reaction`, {
            method: "DELETE",
          })
        : await requestJson<EngagementResponse>(`/post/${post.id}/reaction`, {
            method: "POST",
            body: {
              reaction,
            },
          });

      setPosts((previous) =>
        previous.map((row) =>
          row.id === post.id
            ? {
                ...row,
                engagement: response.engagement,
              }
            : row,
        ),
      );
      if (highlightedPost?.id === post.id) {
        setHighlightedPost((previous) =>
          previous
            ? {
                ...previous,
                engagement: response.engagement,
              }
            : previous,
        );
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to react");
    }
  }

  async function toggleSave(post: FeedPost) {
    try {
      const response = await requestJson<EngagementResponse>(`/post/${post.id}/save`, {
        method: post.engagement?.isSaved ? "DELETE" : "POST",
      });

      setPosts((previous) =>
        previous.map((row) =>
          row.id === post.id
            ? {
                ...row,
                engagement: response.engagement,
              }
            : row,
        ),
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save post");
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

  async function loadComments(postId: string) {
    try {
      const response = await requestJson<PostCommentsResponse>(`/post/${postId}/comments`, {
        method: "GET",
      });
      setCommentsByPost((previous) => ({
        ...previous,
        [postId]: response.comments,
      }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load comments");
    }
  }

  async function addComment(postId: string) {
    const draft = commentDraftByPost[postId]?.trim() ?? "";
    if (!draft) {
      return;
    }

    try {
      const response = await requestJson<CommentCreateResponse>(`/post/${postId}/comments`, {
        method: "POST",
        body: { content: draft },
      });

      setCommentDraftByPost((previous) => ({
        ...previous,
        [postId]: "",
      }));
      setCommentsByPost((previous) => ({
        ...previous,
        [postId]: [response.comment, ...(previous[postId] ?? [])],
      }));
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? {
                ...post,
                engagement: post.engagement
                  ? {
                      ...post.engagement,
                      commentCount: post.engagement.commentCount + 1,
                    }
                  : post.engagement,
              }
            : post,
        ),
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to add comment");
    }
  }

  async function handleShare(postId: string) {
    const shareUrl = `${window.location.origin}/?post=${postId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Share link copied.");
    } catch {
      setStatus(shareUrl);
    }
  }

  const combinedPosts = useMemo(() => {
    if (!highlightedPost) {
      return posts;
    }
    const withoutDuplicate = posts.filter((post) => post.id !== highlightedPost.id);
    return [highlightedPost, ...withoutDuplicate];
  }, [posts, highlightedPost]);

  return (
    <section className="dashboard-panel">
      <header className="feed-header">
        <div className="feed-tab-toggle">
          <button
            className={`feed-tab ${!followingOnly ? "active" : ""}`}
            type="button"
            onClick={() => setFollowingOnly(false)}
          >
            Trending
          </button>
          <button
            className={`feed-tab ${followingOnly ? "active" : ""}`}
            type="button"
            onClick={() => setFollowingOnly(true)}
          >
            Following
          </button>
        </div>
      </header>

      {status ? <p className="panel-status">{status}</p> : null}
      {isLoading ? <p className="empty-state">Loading feed...</p> : null}

      {!isLoading && combinedPosts.length === 0 ? (
        <p className="empty-state">No content uploaded yet.</p>
      ) : null}

      <div className="card-list">
        {combinedPosts.map((post) => (
          <article className={`content-card ${focusedPostId === post.id ? "focused-post" : ""}`} key={post.id}>
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
                <img alt="Post attachment" className="content-image" src={post.image_url} />
              </a>
            ) : null}
            {post.video_url ? (
              <video
                className="content-video"
                controls
                preload="metadata"
                src={post.video_url}
              />
            ) : null}

            <footer className="post-actions">
              <button
                aria-label="Like"
                className={`icon-action ${post.engagement?.myReaction === "like" ? "active" : ""}`}
                type="button"
                onClick={() => void applyReaction(post, "like")}
              >
                <ThumbUpIcon />
                <span>{post.engagement?.likeCount ?? 0}</span>
              </button>
              <button
                aria-label="Dislike"
                className={`icon-action ${post.engagement?.myReaction === "dislike" ? "active" : ""}`}
                type="button"
                onClick={() => void applyReaction(post, "dislike")}
              >
                <ThumbDownIcon />
                <span>{post.engagement?.dislikeCount ?? 0}</span>
              </button>
              <button
                aria-label="Save post"
                className={`icon-action ${post.engagement?.isSaved ? "active" : ""}`}
                type="button"
                onClick={() => void toggleSave(post)}
              >
                <BookmarkIcon />
                <span>{post.engagement?.saveCount ?? 0}</span>
              </button>
              <button aria-label="Share post" className="icon-action" type="button" onClick={() => void handleShare(post.id)}>
                <ShareIcon />
              </button>
              <button
                aria-label="Comments"
                className="icon-action"
                type="button"
                onClick={() => {
                  setOpenCommentsFor((previous) => ({
                    ...previous,
                    [post.id]: !previous[post.id],
                  }));
                  if (!openCommentsFor[post.id]) {
                    void loadComments(post.id);
                  }
                }}
              >
                <CommentIcon />
                <span>{post.engagement?.commentCount ?? 0}</span>
              </button>
              <button aria-label="Report post" className="icon-action report-action" type="button" onClick={() => void handleReport(post.id)}>
                <AlertIcon />
              </button>
              {post.user_id === currentUser.id ? (
                <button className="danger" type="button" onClick={() => void handleDelete(post.id)}>
                  Delete
                </button>
              ) : null}
            </footer>

            {openCommentsFor[post.id] ? (
              <div className="comment-block">
                <div className="composer">
                  <textarea
                    maxLength={500}
                    placeholder="Write a comment"
                    rows={2}
                    value={commentDraftByPost[post.id] ?? ""}
                    onChange={(event) =>
                      setCommentDraftByPost((previous) => ({
                        ...previous,
                        [post.id]: event.target.value,
                      }))
                    }
                  />
                  <button type="button" onClick={() => void addComment(post.id)}>
                    Comment
                  </button>
                </div>

                <div className="card-list">
                  {(commentsByPost[post.id] ?? []).length === 0 ? (
                    <p className="empty-state">No comments yet.</p>
                  ) : (
                    (commentsByPost[post.id] ?? []).map((comment) => (
                      <article className="content-card" key={comment.id}>
                        <header>
                          <strong>@{comment.username}</strong>
                          <time dateTime={comment.created_at}>{formatDateTime(comment.created_at)}</time>
                        </header>
                        <p>{comment.content}</p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {nextCursor ? (
        <button
          className="secondary-btn"
          disabled={isLoadingMore}
          type="button"
          onClick={() => {
            setIsLoadingMore(true);
            void loadFeed(nextCursor, true)
              .catch((error: unknown) => {
                setStatus(error instanceof Error ? error.message : "Failed to load more posts");
              })
              .finally(() => setIsLoadingMore(false));
          }}
        >
          {isLoadingMore ? "Loading..." : "Load more"}
        </button>
      ) : null}
    </section>
  );
}
