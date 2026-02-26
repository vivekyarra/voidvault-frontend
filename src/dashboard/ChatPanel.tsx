import { type FormEvent, useEffect, useMemo, useState } from "react";
import { requestJson } from "../api";
import type {
  ChatConversation,
  ChatListResponse,
  ChatMessage,
  ChatMessagesResponse,
  CurrentUser,
} from "./types";
import { formatDateTime } from "./shared";

export function ChatPanel({
  currentUser,
  chatTargetUserId,
  onChatTargetHandled,
  onOpenProfile,
}: {
  currentUser: CurrentUser;
  chatTargetUserId: string | null;
  onChatTargetHandled: () => void;
  onOpenProfile: (userId: string) => void;
}) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesNextCursor, setMessagesNextCursor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadConversations() {
    setStatus("");
    setIsLoading(true);
    try {
      const response = await requestJson<ChatListResponse>("/chat/list", {
        method: "GET",
      });
      setConversations(response.conversations);
      if (!activeConversationId && response.conversations.length > 0) {
        setActiveConversationId(response.conversations[0].conversation_id);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load chats");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMessages(conversationId: string, before: string | null, append: boolean) {
    const query = before ? `?before=${encodeURIComponent(before)}` : "";
    const response = await requestJson<ChatMessagesResponse>(
      `/chat/${conversationId}/messages${query}`,
      { method: "GET" },
    );
    const fetched = [...response.messages].reverse();
    setMessages((previous) => (append ? [...fetched, ...previous] : fetched));
    setMessagesNextCursor(response.nextCursor);
  }

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setMessagesNextCursor(null);
      return;
    }
    void loadMessages(activeConversationId, null, false).catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : "Failed to load messages");
    });
  }, [activeConversationId]);

  useEffect(() => {
    async function handleTarget() {
      if (!chatTargetUserId) {
        return;
      }
      try {
        const response = await requestJson<{ conversation_id: string }>("/chat/start", {
          method: "POST",
          body: { user_id: chatTargetUserId },
        });
        await loadConversations();
        setActiveConversationId(response.conversation_id);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Failed to open chat");
      } finally {
        onChatTargetHandled();
      }
    }
    void handleTarget();
  }, [chatTargetUserId]);

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeConversationId || !draft.trim()) {
      return;
    }

    try {
      await requestJson<{ message: ChatMessage }>(`/chat/${activeConversationId}/message`, {
        method: "POST",
        body: { content: draft },
      });
      setDraft("");
      await loadMessages(activeConversationId, null, false);
      await loadConversations();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to send message");
    }
  }

  const activeConversation = useMemo(
    () => conversations.find((item) => item.conversation_id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  return (
    <section className="dashboard-panel chat-layout">
      <header className="panel-header">
        <h2>Chat</h2>
      </header>

      {status ? <p className="panel-status">{status}</p> : null}
      {isLoading ? <p className="empty-state">Loading chats...</p> : null}

      <div className="chat-grid">
        <aside className="chat-list">
          {conversations.length === 0 ? <p className="empty-state">No chats yet.</p> : null}
          {conversations.map((conversation) => (
            <button
              key={conversation.conversation_id}
              className={`chat-list-item ${
                activeConversationId === conversation.conversation_id ? "active" : ""
              }`}
              type="button"
              onClick={() => setActiveConversationId(conversation.conversation_id)}
            >
              <strong>@{conversation.other_user?.username ?? "unknown"}</strong>
              <span>{conversation.last_message?.content ?? "No messages yet."}</span>
              <time dateTime={conversation.updated_at}>{formatDateTime(conversation.updated_at)}</time>
            </button>
          ))}
        </aside>

        <section className="chat-thread">
          {!activeConversation ? (
            <p className="empty-state">Select a conversation to start chatting.</p>
          ) : (
            <>
              <header className="chat-thread-header">
                <button
                  className="inline-link"
                  type="button"
                  onClick={() =>
                    activeConversation.other_user
                      ? onOpenProfile(activeConversation.other_user.id)
                      : null
                  }
                >
                  @{activeConversation.other_user?.username ?? "unknown"}
                </button>
              </header>

              {messagesNextCursor ? (
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => void loadMessages(activeConversation.conversation_id, messagesNextCursor, true)}
                >
                  Load older messages
                </button>
              ) : null}

              <div className="message-list">
                {messages.length === 0 ? (
                  <p className="empty-state">No messages yet.</p>
                ) : (
                  messages.map((message) => (
                    <article
                      key={message.id}
                      className={`message-item ${
                        message.sender_id === currentUser.id ? "mine" : "theirs"
                      }`}
                    >
                      <p>{message.content}</p>
                      <time dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>
                    </article>
                  ))
                )}
              </div>

              <form className="message-form" onSubmit={handleSendMessage}>
                <input
                  maxLength={2000}
                  placeholder="Type a message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button type="submit">Send</button>
              </form>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
