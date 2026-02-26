export type DashboardTab =
  | "home"
  | "search"
  | "notifications"
  | "follow"
  | "chat"
  | "profile";

export interface CurrentUser {
  id: string;
  username: string;
  created_at: string;
}

export interface FeedPost {
  id: string;
  user_id: string;
  username: string;
  channel: string;
  content: string;
  image_url: string | null;
  image_blurhash: string | null;
  created_at: string;
  expires_at: string;
}

export interface FeedResponse {
  posts: FeedPost[];
  nextCursor: string | null;
}

export interface SearchUser {
  id: string;
  username: string;
  created_at: string;
  is_following: boolean;
}

export interface SearchPost {
  id: string;
  user_id: string;
  username: string;
  channel: string;
  content: string;
  image_url: string | null;
  created_at: string;
}

export interface SearchResponse {
  query: string;
  users: SearchUser[];
  posts: SearchPost[];
}

export interface NotificationItem {
  id: string;
  type: "follow" | "message" | "report";
  created_at: string;
  actor_id: string | null;
  actor_username: string | null;
  title: string;
  body: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
}

export interface FollowUser {
  id: string;
  username: string;
  followed_at: string;
}

export interface FollowerUser extends FollowUser {
  is_following_back: boolean;
}

export interface FollowSuggestion {
  id: string;
  username: string;
  is_following: boolean;
}

export interface FollowDataResponse {
  following: FollowUser[];
  followers: FollowerUser[];
  suggestions: FollowSuggestion[];
}

export interface ChatConversation {
  conversation_id: string;
  updated_at: string;
  other_user: {
    id: string;
    username: string;
  } | null;
  last_message: {
    id: string;
    sender_id: string;
    sender_username: string;
    content: string;
    created_at: string;
  } | null;
}

export interface ChatListResponse {
  conversations: ChatConversation[];
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
  nextCursor: string | null;
}

export interface ProfilePost {
  id: string;
  user_id: string;
  channel: string;
  content: string;
  image_url: string | null;
  image_blurhash: string | null;
  created_at: string;
  expires_at: string;
  report_count: number;
}

export interface ProfileResponse {
  user: {
    id: string;
    username: string;
    created_at: string;
    trust_score: number;
  };
  stats: {
    followers: number;
    following: number;
    posts: number;
    is_following: boolean;
    is_self: boolean;
  };
  posts: ProfilePost[];
}
