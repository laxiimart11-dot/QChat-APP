export interface BlockedUserRecord {
  uid: string;
  displayName: string;
  photoURL?: string;
  qid?: string;
  email?: string;
  blockedAt: string;
}

export interface UserProfile {
  uid: string;
  qid?: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  photoURL?: string;
  statusText?: string;
  emailVerified?: boolean;
  passwordHash?: string;
  isOnline: boolean;
  lastSeen?: string;
  createdAt?: string;
  blockedUsers?: string[]; // Array of UIDs that this user has blocked
  blockedUserDetails?: Record<string, BlockedUserRecord>; // Detailed record for fast UI display
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  isGroup: boolean;
  participantIds: string[];
  participantNames?: Record<string, string>;
  participantPhotos?: Record<string, string>;
  createdBy: string;
  lastMessageText?: string;
  lastMessageTime?: string;
  lastMessageSenderId?: string;
  avatarIcon?: string;
  deletedBy?: string[]; // UIDs of users who deleted this chat
  isDami?: boolean;
  damiType?: 'private' | 'public';
  damiId?: string;
  damiCreatorId?: string;
}

export interface DamiAccount {
  id: string;
  name: string;
  nameLower: string;
  type: 'private' | 'public';
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  creatorQid?: string;
  description?: string;
  avatarUrl?: string;
  memberIds: string[];
  memberNames?: Record<string, string>;
  memberPhotos?: Record<string, string>;
  channelId: string;
  apiToken?: string;
  apiPermissions?: string[]; // e.g. ['read_messages', 'send_messages', 'send_media', 'read_info']
  webhookUrl?: string; // Outbound Webhook URL for external services
  createdAt: string;
  updatedAt?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  label?: string;
  address?: string;
  isLive?: boolean;
  liveUntil?: number;
  lastUpdated?: number;
  isSharingActive?: boolean;
  liveSenderId?: string;
  accuracy?: number;
  isAllTime?: boolean;
}

export interface ContactData {
  name: string;
  phone?: string;
  email?: string;
  qid?: string;
  avatarUrl?: string;
}

export interface MessageReaction {
  [emoji: string]: string[]; // emoji -> array of user uids
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  mediaType?: 'text' | 'image' | 'audio' | 'sticker' | 'video' | 'document' | 'file' | 'location' | 'contact' | 'gif';
  mediaUrl?: string;
  mediaDuration?: number; // for audio or video in seconds
  fileName?: string;
  fileSize?: number;
  locationData?: LocationData;
  contactData?: ContactData;
  isOneTime?: boolean; // Sender marked this message as One-Time View
  viewedBy?: string[]; // UIDs of users who viewed this one-time message
  vanishedAt?: number;
  vanishedFromReceiver?: boolean; // True once vanished from receiver; changes bubble color for sender
  expiresAt?: number; // 24-hour server expiry epoch milliseconds
  serverVanished?: boolean; // true if mediaUrl was deleted from server after 24h
  reactions?: MessageReaction;
  readBy?: string[]; // UIDs of users who have read the message
  status?: 'sending' | 'sent' | 'delivered' | 'read'; // read-receipt status
  readAt?: Record<string, string>; // uid -> ISO timestamp when read
  deliveredTo?: string[]; // UIDs of users who received the message
  isApiMessage?: boolean;
  tokenName?: string;
  apiTokenName?: string;
  agentName?: string;
  updatedAt?: string;
  isDeletedForEveryone?: boolean;
  deletedForUsers?: string[];
  isEdited?: boolean;
  editedAt?: string;
  createdAt: string;
}

export interface TypingStatus {
  userId: string;
  userName: string;
  channelId: string;
  timestamp: number;
}

export interface MemberRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  senderQid?: string;
  receiverId: string;
  receiverName?: string;
  receiverPhoto?: string;
  receiverQid?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt?: string;
}

export type DeviceMode = 'android' | 'ios';
