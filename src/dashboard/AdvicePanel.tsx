import { type FormEvent, useCallback, useEffect, useState } from "react";
import { requestJson } from "../api";
import type {
  AdvicePost,
  AdviceRepliesResponse,
  AdviceResponse,
  CurrentUser,
} from "./types";
import { formatDateTime } from "./shared";

interface ReplyDraftMap {
  [adviceId: string]: string;
}

interface ReplyMap {
  [adviceId: string]: AdviceRepliesResponse["replies"];
}

export function AdvicePanel({ currentUser }: { currentUser: CurrentUser }) {
  const [mode, setMode] = useState<"need" | "give">("need");
  const [adviceItems, setAdviceItems] = useState<AdvicePost[]>([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<ReplyDraftMap>({});
  const [repliesByAdvice, setRepliesByAdvice] = useState<ReplyMap>({});

  const loadAdvice = useCallback(
    async (cursor: string | null, append: boolean) => {
      const params = new URLSearchParams();
      params.set("mode", mode);
      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await requestJson<AdviceResponse>(`/advice?${params.toString()}`, {
        method: "GET",
      });

      setAdviceItems((previous) =>
        append ? [...previous, ...response.advice] : response.advice,
      );
      setNextCursor(response.nextCursor);
    },
    [mode],
  );

  const refreshAdvice = useCallback(async () => {
    setStatus("");
    setIsLoading(true);
    try {
      await loadAdvice(null, false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load advice");
    } finally {
      setIsLoading(false);
    }
  }, [loadAdvice]);

  useEffect(() => {
    void refreshAdvice();
  }, [refreshAdvice]);

  async function handleAskAdvice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!questionDraft.trim()) {
      return;
    }

    try {
      await requestJson<{ advice: AdvicePost }>("/advice", {
        method: "POST",
        body: {
          content: questionDraft.trim(),
        },
      });
      setQuestionDraft("");
      setStatus("Advice request posted anonymously.");
      await refreshAdvice();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to post advice");
    }
  }

  async function loadReplies(adviceId: string) {
    try {
      const response = await requestJson<AdviceRepliesResponse>(`/advice/${adviceId}/replies`, {
        method: "GET",
      });
      setRepliesByAdvice((previous) => ({
        ...previous,
        [adviceId]: response.replies,
      }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load replies");
    }
  }

  async function handleReply(adviceId: string) {
    const draft = replyDrafts[adviceId]?.trim() ?? "";
    if (!draft) {
      return;
    }

    try {
      await requestJson<{ reply: { id: string } }>(`/advice/${adviceId}/replies`, {
        method: "POST",
        body: { content: draft },
      });
      setReplyDrafts((previous) => ({
        ...previous,
        [adviceId]: "",
      }));
      await Promise.all([loadReplies(adviceId), refreshAdvice()]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to reply");
    }
  }

  return (
    <section className="dashboard-panel">
      <header className="panel-header">
        <h2>Advice</h2>
        <div className="tab-toggle">
          <button
            className={mode === "need" ? "active" : ""}
            type="button"
            onClick={() => setMode("need")}
          >
            Need Advice
          </button>
          <button
            className={mode === "give" ? "active" : ""}
            type="button"
            onClick={() => setMode("give")}
          >
            Give Advice
          </button>
        </div>
      </header>

      {mode === "need" ? (
        <form className="composer" onSubmit={handleAskAdvice}>
          <textarea
            maxLength={800}
            placeholder="Ask for advice anonymously..."
            required
            rows={4}
            value={questionDraft}
            onChange={(event) => setQuestionDraft(event.target.value)}
          />
          <button type="submit">Post Advice Request</button>
        </form>
      ) : null}

      {status ? <p className="panel-status">{status}</p> : null}
      {isLoading ? <p className="empty-state">Loading advice...</p> : null}

      {!isLoading && adviceItems.length === 0 ? (
        <p className="empty-state">No advice requests yet.</p>
      ) : null}

      <div className="card-list">
        {adviceItems.map((advice) => (
          <article className="content-card" key={advice.id}>
            <header>
              <strong>Anonymous</strong>
              <span>{advice.reply_count} replies</span>
              <time dateTime={advice.created_at}>{formatDateTime(advice.created_at)}</time>
            </header>
            <p>{advice.content}</p>

            {mode === "give" ? (
              <div className="composer">
                <textarea
                  maxLength={800}
                  placeholder="Share helpful advice..."
                  rows={3}
                  value={replyDrafts[advice.id] ?? ""}
                  onChange={(event) =>
                    setReplyDrafts((previous) => ({
                      ...previous,
                      [advice.id]: event.target.value,
                    }))
                  }
                />
                <button type="button" onClick={() => void handleReply(advice.id)}>
                  Reply
                </button>
              </div>
            ) : null}

            <footer>
              <button type="button" onClick={() => void loadReplies(advice.id)}>
                View replies
              </button>
            </footer>

            {(repliesByAdvice[advice.id] ?? []).length > 0 ? (
              <div className="card-list">
                {(repliesByAdvice[advice.id] ?? []).map((reply) => (
                  <article className="content-card" key={reply.id}>
                    <header>
                      <strong>
                        {reply.user_id === currentUser.id ? "You" : `@${reply.username}`}
                      </strong>
                      <time dateTime={reply.created_at}>
                        {formatDateTime(reply.created_at)}
                      </time>
                    </header>
                    <p>{reply.content}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {nextCursor ? (
        <button className="secondary-btn" type="button" onClick={() => void loadAdvice(nextCursor, true)}>
          Load more
        </button>
      ) : null}
    </section>
  );
}
