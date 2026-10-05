import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  deleteField,
  type Unsubscribe
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase.ts';
import type { UserProfile, Channel, Message, MemberRequest, BlockedUserRecord, DamiAccount, LocationData, ContactData } from '../types.ts';
import { localMediaCache } from './localMediaCache.ts';

const USERS_COLLECTION = 'users';
const CHANNELS_COLLECTION = 'channels';
const MEMBER_REQUESTS_COLLECTION = 'member_requests';
const DAMI_COLLECTION = 'dami_accounts';

export const chatService = {
  // Save or update user profile
  async saveUserProfile(profile: UserProfile): Promise<void> {
    if (!auth.currentUser || auth.currentUser.uid !== profile.uid) {
      return;
    }
    const path = `${USERS_COLLECTION}/${profile.uid}`;
    try {
      const userRef = doc(db, USERS_COLLECTION, profile.uid);
      await setDoc(userRef, {
        uid: profile.uid,
        qid: (profile.qid || profile.email?.split('@')[0] || profile.uid).toLowerCase().trim(),
        displayName: profile.displayName || 'User',
        email: (profile.email || '').toLowerCase().trim(),
        phoneNumber: profile.phoneNumber || '',
        photoURL: profile.photoURL || '',
        statusText: profile.statusText || 'Active on QChat',
        emailVerified: profile.emailVerified ?? true,
        ...(profile.passwordHash ? { passwordHash: profile.passwordHash } : {}),
        isOnline: profile.isOnline ?? true,
        lastSeen: new Date().toISOString(),
        createdAt: profile.createdAt || new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Update password hash for forgotten password reset
  async updateUserPasswordHash(email: string, passwordHash: string): Promise<boolean> {
    try {
      const user = await this.findUserByIdentifier(email);
      if (!user || !user.uid) return false;
      const userRef = doc(db, USERS_COLLECTION, user.uid);
      await updateDoc(userRef, {
        passwordHash,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error updating password hash:', error);
      return false;
    }
  },

  // Get single user profile by uid
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;
    try {
      const docSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Lookup user by Q ID, email, or phone number
  async findUserByIdentifier(identifier: string): Promise<UserProfile | null> {
    const clean = identifier.trim();
    if (!clean) return null;
    const cleanLower = clean.toLowerCase();
    const cleanWithoutAt = cleanLower.replace(/^@+/, '');
    const cleanDigits = clean.replace(/\D/g, '');

    try {
      const usersRef = collection(db, USERS_COLLECTION);
      const snapshot = await getDocs(usersRef);
      const allUsers = snapshot.docs.map(d => d.data() as UserProfile);

      const found = allUsers.find(u => {
        const uQid = (u.qid || '').toLowerCase().trim().replace(/^@+/, '');
        const uEmail = (u.email || '').toLowerCase().trim();
        const uEmailPrefix = uEmail.split('@')[0];
        const uPhone = (u.phoneNumber || '').trim();
        const uPhoneDigits = uPhone.replace(/\D/g, '');
        const uName = (u.displayName || '').toLowerCase().trim();

        if (uQid && (uQid === cleanLower || uQid === cleanWithoutAt)) return true;
        if (uEmail && (uEmail === cleanLower || uEmailPrefix === cleanWithoutAt)) return true;
        if (uName && uName === cleanLower) return true;
        if (uPhone && (
          uPhone === clean ||
          uPhoneDigits === cleanDigits ||
          (cleanDigits.length >= 7 && (uPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(uPhoneDigits)))
        )) return true;
        return false;
      });

      if (found) return found;

      // Fallback check in local cache if offline or recently created
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('qchat_profile_')) {
          try {
            const cached = JSON.parse(localStorage.getItem(key) || '{}');
            const cQid = (cached.qid || '').toLowerCase().trim().replace(/^@+/, '');
            const cEmail = (cached.email || '').toLowerCase().trim();
            const cEmailPrefix = cEmail.split('@')[0];
            const cPhone = (cached.phoneNumber || '').trim();
            const cPhoneDigits = cPhone.replace(/\D/g, '');

            if (cQid && (cQid === cleanLower || cQid === cleanWithoutAt)) return cached as UserProfile;
            if (cEmail && (cEmail === cleanLower || cEmailPrefix === cleanWithoutAt)) return cached as UserProfile;
            if (cPhoneDigits && cleanDigits.length >= 7 && cPhoneDigits.endsWith(cleanDigits)) return cached as UserProfile;
          } catch {}
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding user by identifier:', error);
      // Fallback to local cache in case of permission or network glitch
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('qchat_profile_')) {
          try {
            const cached = JSON.parse(localStorage.getItem(key) || '{}');
            const cQid = (cached.qid || '').toLowerCase().trim().replace(/^@+/, '');
            const cEmail = (cached.email || '').toLowerCase().trim();
            if (cQid && (cQid === cleanLower || cQid === cleanWithoutAt)) return cached as UserProfile;
            if (cEmail && (cEmail === cleanLower || cEmail.split('@')[0] === cleanWithoutAt)) return cached as UserProfile;
          } catch {}
        }
      }
      return null;
    }
  },

  // Set typing status in channel
  async setTypingStatus(channelId: string, userId: string, userName: string, isTyping: boolean): Promise<void> {
    if (!channelId || !userId || !auth.currentUser) return;
    try {
      const typingDocRef = doc(db, CHANNELS_COLLECTION, channelId, 'typing', userId);
      if (isTyping) {
        await setDoc(typingDocRef, {
          userId,
          userName: userName || 'Someone',
          updatedAt: Date.now()
        }, { merge: true });
      } else {
        await deleteDoc(typingDocRef);
      }
    } catch {
      // Ignored
    }
  },

  // Subscribe to typing users in a channel
  subscribeTypingStatus(channelId: string, currentUserId: string, callback: (typingUsers: string[]) => void): Unsubscribe {
    if (!channelId || !auth.currentUser) return () => {};
    try {
      const typingCol = collection(db, CHANNELS_COLLECTION, channelId, 'typing');
      return onSnapshot(
        typingCol,
        (snapshot) => {
          const now = Date.now();
          const typers: string[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            if (data.userId !== currentUserId && data.updatedAt && (now - data.updatedAt < 6000)) {
              typers.push(data.userName || 'Someone');
            }
          });
          callback(typers);
        },
        () => {
          callback([]);
        }
      );
    } catch {
      return () => {};
    }
  },

  // Set user online/offline status
  async setUserOnlineStatus(uid: string, isOnline: boolean): Promise<void> {
    if (!uid || !auth.currentUser) return;
    if (auth.currentUser.uid !== uid && !uid.startsWith('demo_')) return;
    const path = `${USERS_COLLECTION}/${uid}`;
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: new Date().toISOString()
      });
    } catch {
      // Ignored if user profile doc doesn't exist yet
    }
  },

  // Subscribe to all registered users
  subscribeUsers(callback: (users: UserProfile[]) => void): Unsubscribe {
    if (!auth.currentUser) {
      return () => {};
    }
    const path = USERS_COLLECTION;
    try {
      const q = query(collection(db, USERS_COLLECTION), limit(50));
      return onSnapshot(
        q,
        (snapshot) => {
          const users: UserProfile[] = [];
          snapshot.forEach((docSnap) => {
            users.push(docSnap.data() as UserProfile);
          });
          callback(users);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, path);
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return () => {};
    }
  },

  // Subscribe to channels (only return channels where currentUser is a participant)
  subscribeChannels(callback: (channels: Channel[]) => void): Unsubscribe {
    if (!auth.currentUser) {
      return () => {};
    }
    const currentUid = auth.currentUser.uid;
    const path = CHANNELS_COLLECTION;
    try {
      const q = query(collection(db, CHANNELS_COLLECTION));
      return onSnapshot(
        q,
        (snapshot) => {
          const channels: Channel[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Omit<Channel, 'id'>;
            // Only show channels where user is a participant and not deleted by user
            if (
              data.participantIds &&
              Array.isArray(data.participantIds) &&
              data.participantIds.includes(currentUid) &&
              (!data.deletedBy || !data.deletedBy.includes(currentUid))
            ) {
              channels.push({ id: docSnap.id, ...data });
            }
          });
          // Sort by lastMessageTime descending, or id
          channels.sort((a, b) => {
            const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            return timeB - timeA;
          });
          callback(channels);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, path);
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return () => {};
    }
  },

  // Create channel or direct chat
  async createChannel(channelData: {
    name: string;
    description?: string;
    isGroup: boolean;
    participantIds: string[];
    participantNames?: Record<string, string>;
    participantPhotos?: Record<string, string>;
    createdBy: string;
    avatarIcon?: string;
  }): Promise<string> {
    if (!auth.currentUser || auth.currentUser.uid !== channelData.createdBy) {
      return '';
    }
    const path = CHANNELS_COLLECTION;
    try {
      const channelsCol = collection(db, CHANNELS_COLLECTION);
      const newDocRef = await addDoc(channelsCol, {
        ...channelData,
        lastMessageText: channelData.isGroup ? 'Welcome to the channel!' : 'Chat started',
        lastMessageTime: new Date().toISOString(),
        lastMessageSenderId: channelData.createdBy
      });

      // Add a greeting message
      const messagesCol = collection(db, CHANNELS_COLLECTION, newDocRef.id, 'messages');
      await addDoc(messagesCol, {
        channelId: newDocRef.id,
        senderId: channelData.createdBy,
        senderName: 'QChat Bot',
        senderPhoto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        text: channelData.isGroup
          ? `Welcome to #${channelData.name} on QChat! Feel free to chat, share photos, audio, and connect in real-time!`
          : `Direct conversation started. Say hello!`,
        mediaType: 'text',
        readBy: [channelData.createdBy],
        createdAt: new Date().toISOString()
      });

      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  // Subscribe to messages in a channel with 24-hour server media expiry and local caching
  subscribeMessages(channelId: string, callback: (messages: Message[]) => void): Unsubscribe {
    if (!channelId || !auth.currentUser) return () => {};
    const path = `${CHANNELS_COLLECTION}/${channelId}/messages`;
    try {
      const messagesCol = collection(db, CHANNELS_COLLECTION, channelId, 'messages');
      const q = query(messagesCol, orderBy('createdAt', 'asc'), limit(150));
      return onSnapshot(
        q,
        (snapshot) => {
          const messages: Message[] = [];
          const now = Date.now();

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Omit<Message, 'id'>;
            const msg: Message = { id: docSnap.id, ...data };

            // 1. If image has a server mediaUrl, cache into device memory immediately
            if (msg.mediaType === 'image' && msg.mediaUrl) {
              localMediaCache.saveToDeviceMemory(msg.id, msg.mediaUrl, msg.fileName);
            }

            // 2. Check 24-hour server expiry: vanish mediaUrl from server if expired
            if (msg.mediaType === 'image' && msg.expiresAt && now > msg.expiresAt && !msg.serverVanished && msg.mediaUrl) {
              msg.serverVanished = true;
              msg.mediaUrl = '';
              // Fire background server update to remove media from Firestore
              updateDoc(doc(db, CHANNELS_COLLECTION, channelId, 'messages', docSnap.id), {
                mediaUrl: '',
                serverVanished: true
              }).catch(() => {});
            }

            messages.push(msg);
          });
          callback(messages);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, path);
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return () => {};
    }
  },

  // Send a message
  async sendMessage(
    channelId: string,
    message: {
      senderId: string;
      senderName: string;
      senderPhoto?: string;
      text: string;
      mediaType?: 'text' | 'image' | 'audio' | 'sticker' | 'video' | 'document' | 'file' | 'location' | 'contact' | 'gif';
      mediaUrl?: string;
      mediaDuration?: number;
      fileName?: string;
      fileSize?: number;
      locationData?: LocationData;
      contactData?: ContactData;
      expiresAt?: number;
      isOneTime?: boolean;
    }
  ): Promise<string> {
    if (!auth.currentUser || auth.currentUser.uid !== message.senderId) return '';
    const path = `${CHANNELS_COLLECTION}/${channelId}/messages`;
    try {
      const messagesCol = collection(db, CHANNELS_COLLECTION, channelId, 'messages');
      const now = new Date().toISOString();
      const expiresAt = message.mediaType === 'image'
        ? (message.expiresAt || (Date.now() + 24 * 60 * 60 * 1000))
        : null;

      // Auto-vanish: When any subsequent SMS/message is sent in this channel,
      // any previous one-time message must immediately vanish from the receiver's view,
      // while preserving color-change for the sender!
      try {
        const existingMsgsSnap = await getDocs(messagesCol);
        for (const msgDoc of existingMsgsSnap.docs) {
          const mData = msgDoc.data();
          if (mData.isOneTime === true && !mData.vanishedFromReceiver) {
            await updateDoc(msgDoc.ref, {
              vanishedFromReceiver: true,
              vanishedAt: Date.now()
            }).catch(() => {});
            localMediaCache.deleteFromDeviceMemory(msgDoc.id);
            fetch('/api/messages/vanish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ channelId, messageId: msgDoc.id })
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.warn('One-time message auto-vanish check error:', e);
      }

      // Sanitize locationData: Firestore strictly rejects any object containing `undefined` values
      let cleanLocationData: Record<string, any> | null = null;
      if (message.locationData) {
        cleanLocationData = {
          latitude: Number(message.locationData.latitude) || 0,
          longitude: Number(message.locationData.longitude) || 0,
          label: message.locationData.label || 'Location',
          address: message.locationData.address || '',
          isLive: Boolean(message.locationData.isLive),
          isSharingActive: message.locationData.isSharingActive !== false,
          lastUpdated: message.locationData.lastUpdated || Date.now()
        };
        if (typeof message.locationData.accuracy === 'number' && !isNaN(message.locationData.accuracy)) {
          cleanLocationData.accuracy = message.locationData.accuracy;
        }
        if (typeof message.locationData.liveUntil === 'number' && !isNaN(message.locationData.liveUntil)) {
          cleanLocationData.liveUntil = message.locationData.liveUntil;
        }
        if (message.locationData.isAllTime) {
          cleanLocationData.isAllTime = true;
        }
        if (message.locationData.liveSenderId) {
          cleanLocationData.liveSenderId = message.locationData.liveSenderId;
        }
      }

      // Sanitize contactData
      let cleanContactData: Record<string, any> | null = null;
      if (message.contactData) {
        cleanContactData = {
          name: message.contactData.name || 'Contact',
          phone: message.contactData.phone || '',
          email: message.contactData.email || '',
          qid: message.contactData.qid || '',
          avatarUrl: message.contactData.avatarUrl || ''
        };
      }

      const docRef = await addDoc(messagesCol, {
        channelId,
        senderId: message.senderId,
        senderName: message.senderName,
        senderPhoto: message.senderPhoto || '',
        text: message.text || '',
        mediaType: message.mediaType || 'text',
        mediaUrl: message.mediaUrl || '',
        mediaDuration: message.mediaDuration || 0,
        fileName: message.fileName || '',
        fileSize: message.fileSize || null,
        locationData: cleanLocationData,
        contactData: cleanContactData,
        isOneTime: message.isOneTime === true,
        viewedBy: [message.senderId],
        expiresAt: expiresAt || null,
        serverVanished: false,
        reactions: {},
        readBy: [message.senderId],
        status: 'sent',
        deliveredTo: [message.senderId],
        readAt: {},
        createdAt: now
      });

      // Save to local device memory immediately
      if (message.mediaType === 'image' && message.mediaUrl) {
        localMediaCache.saveToDeviceMemory(docRef.id, message.mediaUrl, message.fileName);
      }

      // Update parent channel preview
      const channelRef = doc(db, CHANNELS_COLLECTION, channelId);
      const previewText = message.mediaType === 'image'
        ? '📷 Photo'
        : message.mediaType === 'video'
        ? '🎥 Video'
        : message.mediaType === 'document' || message.mediaType === 'file'
        ? `📄 ${message.fileName || 'Document'}`
        : message.mediaType === 'location'
        ? `📍 ${message.locationData?.label || 'Location'}`
        : message.mediaType === 'contact'
        ? `👤 ${message.contactData?.name || 'Contact'}`
        : message.mediaType === 'gif'
        ? '🎬 GIF'
        : message.mediaType === 'audio'
        ? '🎤 Voice note'
        : message.mediaType === 'sticker'
        ? '🎨 Sticker'
        : message.text.slice(0, 80);

      await updateDoc(channelRef, {
        lastMessageText: previewText,
        lastMessageTime: now,
        lastMessageSenderId: message.senderId,
        deletedBy: [] // reset deletedBy so any new incoming message shows in recipient's list
      });

      // Dispatch outbound webhook in background if this channel is connected to an external webhook
      if (typeof window !== 'undefined' && docRef.id && !message.senderId.startsWith('dami_')) {
        fetch('/api/dami/trigger-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId,
            messageId: docRef.id,
            senderId: message.senderId,
            senderName: message.senderName,
            text: message.text
          })
        }).catch(() => {});
      }

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  // Add or remove reaction emoji
  async toggleReaction(
    channelId: string,
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> {
    if (!auth.currentUser || auth.currentUser.uid !== userId) return;
    const path = `${CHANNELS_COLLECTION}/${channelId}/messages/${messageId}`;
    try {
      const msgRef = doc(db, CHANNELS_COLLECTION, channelId, 'messages', messageId);
      const snap = await getDoc(msgRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const reactions = data.reactions || {};
      const currentList: string[] = reactions[emoji] || [];

      let updatedList: string[];
      if (currentList.includes(userId)) {
        updatedList = currentList.filter(id => id !== userId);
      } else {
        updatedList = [...currentList, userId];
      }

      const updatedReactions = { ...reactions };
      if (updatedList.length > 0) {
        updatedReactions[emoji] = updatedList;
      } else {
        delete updatedReactions[emoji];
      }

      await updateDoc(msgRef, { reactions: updatedReactions });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Update Live Location coordinates in real time
  async updateLiveLocation(
    channelId: string,
    messageId: string,
    coords: { latitude: number; longitude: number; accuracy?: number }
  ): Promise<void> {
    const path = `${CHANNELS_COLLECTION}/${channelId}/messages/${messageId}`;
    try {
      const msgRef = doc(db, CHANNELS_COLLECTION, channelId, 'messages', messageId);
      const snap = await getDoc(msgRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const existingLocation = data.locationData || {};

      if (existingLocation.isSharingActive === false) return;
      if (!existingLocation.isAllTime && existingLocation.liveUntil && Date.now() > existingLocation.liveUntil) {
        await updateDoc(msgRef, {
          'locationData.isSharingActive': false
        });
        return;
      }

      await updateDoc(msgRef, {
        'locationData.latitude': coords.latitude,
        'locationData.longitude': coords.longitude,
        'locationData.accuracy': coords.accuracy ?? existingLocation.accuracy ?? null,
        'locationData.lastUpdated': Date.now()
      });
    } catch (error) {
      console.warn('Error updating live location in Firestore:', error);
    }
  },

  // Stop sharing Live Location
  async stopLiveLocation(
    channelId: string,
    messageId: string
  ): Promise<void> {
    const path = `${CHANNELS_COLLECTION}/${channelId}/messages/${messageId}`;
    try {
      const msgRef = doc(db, CHANNELS_COLLECTION, channelId, 'messages', messageId);
      await updateDoc(msgRef, {
        'locationData.isSharingActive': false,
        'locationData.lastUpdated': Date.now()
      });
    } catch (error) {
      console.warn('Error stopping live location in Firestore:', error);
    }
  },

  // Delete message (legacy permanent or fallback)
  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    if (!auth.currentUser) return;
    const path = `${CHANNELS_COLLECTION}/${channelId}/messages/${messageId}`;
    try {
      const msgRef = doc(db, CHANNELS_COLLECTION, channelId, 'messages', messageId);
      await deleteDoc(msgRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Vanish a one-time message from receiver while preserving color-change for sender
  async vanishOneTimeMessage(channelId: string, messageId: string): Promise<void> {
    try {
      const msgRef = doc(db, CHANNELS_COLLECTION, channelId, 'messages', messageId);
      await updateDoc(msgRef, {
        vanishedFromReceiver: true,
        vanishedAt: Date.now()
      }).catch(() => {});
    } catch {
      // ignore
    }
    try {
      localMediaCache.deleteFromDeviceMemory(messageId);
    } catch {}
    try {
      fetch('/api/messages/vanish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, messageId })
      }).catch(() => {});
    } catch {}
  },

  // Mark one-time message as viewed
  async markOneTimeViewed(channelId: string, messageId: string, userId: string): Promise<void> {
    try {
      const msgRef = doc(db, CHANNELS_COLLECTION, channelId, 'messages', messageId);
      await updateDoc(msgRef, {
        viewedBy: arrayUnion(userId)
      }).catch(() => {});
    } catch {}
  },

  // Delete message for everyone (replaces content with tombstone so all participants see it was deleted)
  async deleteMessageForEveryone(channelId: string, messageId: string): Promise<void> {
    if (!auth.currentUser) return;
    const path = `${CHANNELS_COLLECTION}/${channelId}/messages/${messageId}`;
    try {
      const msgRef = doc(db, CHANNELS_COLLECTION, channelId, 'messages', messageId);
      await updateDoc(msgRef, {
        isDeletedForEveryone: true,
        text: 'This message was deleted',
        mediaUrl: null,
        mediaType: 'text',
        fileName: null,
        fileSize: null,
        locationData: null,
        contactData: null,
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Delete message for current user only (hidden for them, remains visible for others)
  async deleteMessageForMe(channelId: string, messageId: string, userId: string): Promise<void> {
    if (!auth.currentUser) return;
    const path = `${CHANNELS_COLLECTION}/${channelId}/messages/${messageId}`;
    try {
      const msgRef = doc(db, CHANNELS_COLLECTION, channelId, 'messages', messageId);
      await updateDoc(msgRef, {
        deletedForUsers: arrayUnion(userId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Edit message within 30 minutes of sending
  async editMessage(channelId: string, messageId: string, newText: string): Promise<void> {
    if (!auth.currentUser) return;
    const path = `${CHANNELS_COLLECTION}/${channelId}/messages/${messageId}`;
    try {
      const msgRef = doc(db, CHANNELS_COLLECTION, channelId, 'messages', messageId);
      const snap = await getDoc(msgRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const createdAt = new Date(data.createdAt).getTime();
      const diffMinutes = (Date.now() - createdAt) / (60 * 1000);
      if (diffMinutes > 30) {
        throw new Error('Messages can only be edited within 30 minutes of sending.');
      }
      await updateDoc(msgRef, {
        text: newText.trim(),
        isEdited: true,
        editedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  // Mark messages as read by the current user
  async markMessagesAsRead(
    channelId: string,
    messageIds: string[],
    userId: string
  ): Promise<void> {
    if (!auth.currentUser || auth.currentUser.uid !== userId || !channelId || messageIds.length === 0) {
      return;
    }
    const path = `${CHANNELS_COLLECTION}/${channelId}/messages`;
    try {
      const updates = messageIds.map((msgId) => {
        const msgRef = doc(db, CHANNELS_COLLECTION, channelId, 'messages', msgId);
        return updateDoc(msgRef, {
          readBy: arrayUnion(userId)
        });
      });
      await Promise.allSettled(updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Mark sent messages as read by an online recipient and update metadata
  async markMessagesAsReadByRecipient(
    channelId: string,
    messageIds: string[],
    recipientId: string
  ): Promise<void> {
    if (!auth.currentUser || !channelId || messageIds.length === 0 || !recipientId) return;
    const path = `${CHANNELS_COLLECTION}/${channelId}/messages`;
    try {
      const now = new Date().toISOString();
      const updates = messageIds.map((msgId) => {
        const msgRef = doc(db, CHANNELS_COLLECTION, channelId, 'messages', msgId);
        return updateDoc(msgRef, {
          readBy: arrayUnion(recipientId),
          deliveredTo: arrayUnion(recipientId),
          status: 'read',
          [`readAt.${recipientId}`]: now,
          updatedAt: now
        });
      });
      await Promise.allSettled(updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Mark sent messages as read by multiple online recipients
  async markMessagesAsReadByRecipients(
    channelId: string,
    messageIds: string[],
    recipientIds: string[]
  ): Promise<void> {
    if (!auth.currentUser || !channelId || messageIds.length === 0 || recipientIds.length === 0) return;
    const path = `${CHANNELS_COLLECTION}/${channelId}/messages`;
    try {
      const now = new Date().toISOString();
      const updates = messageIds.map((msgId) => {
        const msgRef = doc(db, CHANNELS_COLLECTION, channelId, 'messages', msgId);
        const updateData: Record<string, any> = {
          readBy: arrayUnion(...recipientIds),
          deliveredTo: arrayUnion(...recipientIds),
          status: 'read',
          updatedAt: now
        };
        recipientIds.forEach((rId) => {
          updateData[`readAt.${rId}`] = now;
        });
        return updateDoc(msgRef, updateData);
      });
      await Promise.allSettled(updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Ensure current user is tracked in channel participantIds (for calculating group read receipts)
  async joinChannel(channelId: string, userId: string): Promise<void> {
    if (!auth.currentUser || auth.currentUser.uid !== userId || !channelId) return;
    try {
      const chanRef = doc(db, CHANNELS_COLLECTION, channelId);
      await updateDoc(chanRef, {
        participantIds: arrayUnion(userId)
      });
    } catch {
      // Ignored if not permitted or network offline
    }
  },

  // Bootstrap default starter channels and demo contacts if needed
  async seedDefaultChannels(currentUserId: string): Promise<void> {
    if (!auth.currentUser || auth.currentUser.uid !== currentUserId) return;
    try {
      // Seed sample contacts so user can test 1-to-1 chats and online read receipts immediately
      const usersSnap = await getDocs(query(collection(db, USERS_COLLECTION), limit(3)));
      if (usersSnap.size <= 1) {
        const demoContacts: UserProfile[] = [
          {
            uid: 'demo_sophia_chen',
            displayName: 'Sophia Chen',
            email: 'sophia.chen@example.com',
            photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
            statusText: 'Available for chats & discussions',
            isOnline: true,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString()
          },
          {
            uid: 'demo_liam_miller',
            displayName: 'Liam Miller',
            email: 'liam.miller@example.com',
            photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
            statusText: 'Away from desk • Offline',
            isOnline: false,
            lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString()
          },
          {
            uid: 'demo_emma_watson',
            displayName: 'Emma Watson',
            email: 'emma.watson@example.com',
            photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            statusText: 'Online • Real-time Sync Active',
            isOnline: true,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
        ];

        for (const contact of demoContacts) {
          try {
            const cRef = doc(db, USERS_COLLECTION, contact.uid);
            await setDoc(cRef, contact, { merge: true });
          } catch {
            // Ignored
          }
        }
      }
    } catch (err) {
      console.warn('Contacts seeding check:', err);
    }
  },

  // 1. Send member / friend connection request by User ID / Q ID
  async sendMemberRequest(
    sender: UserProfile,
    targetIdentifier: string
  ): Promise<{ success: boolean; message: string; targetUser?: UserProfile; channelId?: string; directAdded?: boolean }> {
    if (!sender?.uid || !targetIdentifier?.trim()) {
      return { success: false, message: 'Please enter a valid User ID.' };
    }

    const cleanInput = targetIdentifier.trim();
    // Look up target user strictly by identifier
    const targetUser = await this.findUserByIdentifier(cleanInput);
    if (!targetUser) {
      return {
        success: false,
        message: `Member with User ID "${cleanInput}" could not be found. Please check the spelling.`
      };
    }

    if (targetUser.uid === sender.uid) {
      return { success: false, message: 'You cannot send a friend request to your own User ID.' };
    }

    // Check if a direct conversation already exists (or existed previously) between them
    try {
      const channelsSnap = await getDocs(collection(db, CHANNELS_COLLECTION));
      let foundChannelId: string | null = null;
      let foundChannelData: Channel | null = null;

      for (const docSnap of channelsSnap.docs) {
        const data = docSnap.data() as Channel;
        if (
          !data.isGroup &&
          data.participantIds &&
          data.participantIds.includes(sender.uid) &&
          data.participantIds.includes(targetUser.uid)
        ) {
          foundChannelId = docSnap.id;
          foundChannelData = data;
          break;
        }
      }

      if (foundChannelId && foundChannelData) {
        // Conversation already exists or existed before!
        // Direct add without sending a request!
        const chRef = doc(db, CHANNELS_COLLECTION, foundChannelId);

        // If it was deleted by the sender, restore it immediately
        if (foundChannelData.deletedBy && foundChannelData.deletedBy.includes(sender.uid)) {
          await updateDoc(chRef, {
            deletedBy: arrayRemove(sender.uid)
          });
        }

        return {
          success: true,
          message: `Directly connected with @${targetUser.qid || targetUser.displayName}!`,
          channelId: foundChannelId,
          targetUser,
          directAdded: true
        };
      }
    } catch (err) {
      console.warn('Error checking existing channels:', err);
    }

    // Check if a pending request already exists in member_requests
    try {
      const reqCol = collection(db, MEMBER_REQUESTS_COLLECTION);
      const reqSnap = await getDocs(reqCol);
      let existingPendingSender = false;
      let existingIncomingReq: MemberRequest | null = null;

      reqSnap.forEach((d) => {
        const r = { id: d.id, ...d.data() } as MemberRequest;
        if (r.status === 'pending') {
          if (r.senderId === sender.uid && r.receiverId === targetUser.uid) {
            existingPendingSender = true;
          }
          if (r.senderId === targetUser.uid && r.receiverId === sender.uid) {
            existingIncomingReq = r;
          }
        }
      });

      if (existingPendingSender) {
        return {
          success: false,
          message: `A request was already sent to @${targetUser.qid || targetUser.displayName}. Waiting for them to accept.`
        };
      }

      if (existingIncomingReq) {
        // The other user already sent a request to this user! Accept it directly.
        const channelId = await this.acceptMemberRequest(existingIncomingReq, sender);
        return {
          success: true,
          message: `@${targetUser.qid || targetUser.displayName} also sent you a request! You are now connected!`,
          channelId,
          targetUser
        };
      }
    } catch (err) {
      console.warn('Error checking existing requests:', err);
    }

    // Create new pending member request
    try {
      const reqCol = collection(db, MEMBER_REQUESTS_COLLECTION);
      await addDoc(reqCol, {
        senderId: sender.uid,
        senderName: sender.displayName,
        senderPhoto: sender.photoURL || '',
        senderQid: (sender.qid || '').replace(/^@+/, ''),
        receiverId: targetUser.uid,
        receiverName: targetUser.displayName,
        receiverPhoto: targetUser.photoURL || '',
        receiverQid: (targetUser.qid || '').replace(/^@+/, ''),
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        message: `Request sent to @${targetUser.qid || targetUser.displayName}! Once accepted, you can chat with each other.`,
        targetUser
      };
    } catch (error) {
      console.error('Error creating member request:', error);
      return { success: false, message: 'Failed to send request. Please check your connection and try again.' };
    }
  },

  // 2. Subscribe to incoming member requests
  subscribeIncomingRequests(
    userId: string,
    callback: (requests: MemberRequest[]) => void
  ): Unsubscribe {
    if (!userId || !auth.currentUser) return () => {};
    try {
      const reqCol = collection(db, MEMBER_REQUESTS_COLLECTION);
      return onSnapshot(
        reqCol,
        (snapshot) => {
          const requests: MemberRequest[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as Omit<MemberRequest, 'id'>;
            if (data.receiverId === userId && data.status === 'pending') {
              requests.push({ id: d.id, ...data });
            }
          });
          requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          callback(requests);
        },
        () => callback([])
      );
    } catch {
      return () => {};
    }
  },

  // 3. Subscribe to sent member requests
  subscribeSentRequests(
    userId: string,
    callback: (requests: MemberRequest[]) => void
  ): Unsubscribe {
    if (!userId || !auth.currentUser) return () => {};
    try {
      const reqCol = collection(db, MEMBER_REQUESTS_COLLECTION);
      return onSnapshot(
        reqCol,
        (snapshot) => {
          const requests: MemberRequest[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as Omit<MemberRequest, 'id'>;
            if (data.senderId === userId && data.status === 'pending') {
              requests.push({ id: d.id, ...data });
            }
          });
          requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          callback(requests);
        },
        () => callback([])
      );
    } catch {
      return () => {};
    }
  },

  // 4. Accept a member request
  async acceptMemberRequest(request: MemberRequest, currentUser: UserProfile): Promise<string> {
    try {
      // Mark request as accepted
      const reqRef = doc(db, MEMBER_REQUESTS_COLLECTION, request.id);
      await updateDoc(reqRef, {
        status: 'accepted',
        updatedAt: new Date().toISOString()
      });

      // Check if a direct channel already exists
      const channelsSnap = await getDocs(collection(db, CHANNELS_COLLECTION));
      let existingChannelId = '';
      channelsSnap.forEach((docSnap) => {
        const c = docSnap.data() as Channel;
        if (
          !c.isGroup &&
          c.participantIds &&
          c.participantIds.includes(request.senderId) &&
          c.participantIds.includes(request.receiverId)
        ) {
          existingChannelId = docSnap.id;
        }
      });

      if (existingChannelId) {
        return existingChannelId;
      }

      // Create direct 1-to-1 conversation
      const otherUserName =
        request.senderId === currentUser.uid
          ? request.receiverName || 'Friend'
          : request.senderName;
      const otherUserPhoto =
        request.senderId === currentUser.uid
          ? request.receiverPhoto
          : request.senderPhoto;

      const newId = await this.createChannel({
        name: otherUserName,
        description: `Direct conversation`,
        isGroup: false,
        participantIds: [request.senderId, request.receiverId],
        participantNames: {
          [request.senderId]: request.senderName,
          [request.receiverId]: currentUser.displayName
        },
        participantPhotos: {
          [request.senderId]: request.senderPhoto || '',
          [request.receiverId]: currentUser.photoURL || ''
        },
        createdBy: currentUser.uid,
        avatarIcon: 'user'
      });

      return newId;
    } catch (err) {
      console.error('Error accepting member request:', err);
      return '';
    }
  },

  // 5. Decline a member request
  async declineMemberRequest(requestId: string): Promise<boolean> {
    try {
      const reqRef = doc(db, MEMBER_REQUESTS_COLLECTION, requestId);
      await updateDoc(reqRef, {
        status: 'declined',
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.error('Error declining request:', err);
      return false;
    }
  },

  // 6. Cancel a sent member request
  async cancelMemberRequest(requestId: string): Promise<boolean> {
    try {
      const reqRef = doc(db, MEMBER_REQUESTS_COLLECTION, requestId);
      await deleteDoc(reqRef);
      return true;
    } catch (err) {
      console.error('Error cancelling request:', err);
      return false;
    }
  },

  // 7. Delete chat for the current user ONLY. The other user's chat & messages remain 100% intact!
  async deleteMemberChat(channelId: string, currentUserId: string, _otherUserId?: string): Promise<boolean> {
    try {
      if (!channelId || !currentUserId) return false;

      // ONLY mark this channel as deleted for currentUserId.
      // NEVER delete the channel document, so the other person does not lose their chat!
      const chRef = doc(db, CHANNELS_COLLECTION, channelId);
      await updateDoc(chRef, {
        deletedBy: arrayUnion(currentUserId)
      });

      return true;
    } catch (error) {
      console.error('Error deleting member chat:', error);
      return false;
    }
  },

  // 8. Block a member / user
  async blockUser(
    currentUser: UserProfile,
    targetUser: { uid: string; displayName: string; photoURL?: string; qid?: string; email?: string }
  ): Promise<boolean> {
    if (!currentUser?.uid || !targetUser?.uid || currentUser.uid === targetUser.uid) {
      return false;
    }
    const currentUid = currentUser.uid;
    const targetUid = targetUser.uid;
    const record: BlockedUserRecord = {
      uid: targetUid,
      displayName: targetUser.displayName || 'User',
      photoURL: targetUser.photoURL || '',
      qid: (targetUser.qid || '').replace(/^@+/, ''),
      email: targetUser.email || '',
      blockedAt: new Date().toISOString()
    };

    // Update local cache immediately for instant UI feedback
    try {
      const cacheKey = `qchat_blocked_${currentUid}`;
      const existingStr = localStorage.getItem(cacheKey);
      const existingList: BlockedUserRecord[] = existingStr ? JSON.parse(existingStr) : [];
      if (!existingList.some((u) => u.uid === targetUid)) {
        existingList.unshift(record);
        localStorage.setItem(cacheKey, JSON.stringify(existingList));
      }
    } catch {
      // ignore
    }

    // Persist to Firestore
    try {
      const userRef = doc(db, USERS_COLLECTION, currentUid);
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(targetUid),
        [`blockedUserDetails.${targetUid}`]: record
      });
      return true;
    } catch (err) {
      console.error('Error blocking user in Firestore:', err);
      try {
        const userRef = doc(db, USERS_COLLECTION, currentUid);
        await setDoc(
          userRef,
          {
            blockedUsers: arrayUnion(targetUid),
            blockedUserDetails: {
              [targetUid]: record
            }
          },
          { merge: true }
        );
        return true;
      } catch (mergeErr) {
        console.error('Error merge blocking user:', mergeErr);
        return false;
      }
    }
  },

  // 9. Unblock a user
  async unblockUser(currentUserId: string, targetUserId: string): Promise<boolean> {
    if (!currentUserId || !targetUserId) return false;

    // Update local cache immediately
    try {
      const cacheKey = `qchat_blocked_${currentUserId}`;
      const existingStr = localStorage.getItem(cacheKey);
      if (existingStr) {
        const existingList: BlockedUserRecord[] = JSON.parse(existingStr);
        const filtered = existingList.filter((u) => u.uid !== targetUserId);
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
      }
    } catch {
      // ignore
    }

    // Persist to Firestore
    try {
      const userRef = doc(db, USERS_COLLECTION, currentUserId);
      await updateDoc(userRef, {
        blockedUsers: arrayRemove(targetUserId),
        [`blockedUserDetails.${targetUserId}`]: deleteField()
      });
      return true;
    } catch (err) {
      console.error('Error unblocking user in Firestore:', err);
      try {
        const userRef = doc(db, USERS_COLLECTION, currentUserId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const bUsers = (data.blockedUsers || []).filter((id: string) => id !== targetUserId);
          const bDetails = { ...(data.blockedUserDetails || {}) };
          delete bDetails[targetUserId];
          await updateDoc(userRef, {
            blockedUsers: bUsers,
            blockedUserDetails: bDetails
          });
          return true;
        }
      } catch (fallbackErr) {
        console.error('Fallback unblock failed:', fallbackErr);
      }
      return false;
    }
  },

  // 10. Subscribe to blocked users of current user
  subscribeBlockedUsers(
    currentUserId: string,
    callback: (blockedList: BlockedUserRecord[]) => void
  ): Unsubscribe {
    if (!currentUserId) {
      callback([]);
      return () => {};
    }

    // Immediate initial emission from localStorage if available
    try {
      const cacheKey = `qchat_blocked_${currentUserId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        callback(JSON.parse(cached));
      }
    } catch {
      // ignore
    }

    try {
      const userRef = doc(db, USERS_COLLECTION, currentUserId);
      return onSnapshot(
        userRef,
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          const detailsMap = data.blockedUserDetails || {};
          const blockedUids: string[] = data.blockedUsers || Object.keys(detailsMap);

          const list: BlockedUserRecord[] = [];
          for (const uid of blockedUids) {
            if (detailsMap[uid]) {
              list.push(detailsMap[uid]);
            } else {
              list.push({
                uid,
                displayName: 'Blocked User',
                blockedAt: new Date().toISOString()
              });
            }
          }

          // Sort by blockedAt descending
          list.sort((a, b) => new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime());

          // Save to local cache
          try {
            localStorage.setItem(`qchat_blocked_${currentUserId}`, JSON.stringify(list));
          } catch {
            // ignore
          }

          callback(list);
        },
        (err) => {
          console.warn('Error subscribing to blocked users:', err);
        }
      );
    } catch {
      return () => {};
    }
  },

  // 11. Create a Dami (Dummy) Account (Private or Public)
  async createDamiAccount(params: {
    name: string;
    type: 'private' | 'public';
    description?: string;
    avatarUrl?: string;
    memberIds?: string[];
    memberNames?: Record<string, string>;
    memberPhotos?: Record<string, string>;
    currentUser: UserProfile;
  }): Promise<{ success: boolean; message: string; damiAccount?: DamiAccount; channelId?: string }> {
    const rawName = params.name.trim();
    if (!rawName) {
      return { success: false, message: 'Please enter a name for the Dami Account.' };
    }

    // Rule: Must end with at least one number
    if (!/\d+$/.test(rawName)) {
      return {
        success: false,
        message: 'Dami Account name must end with a number (e.g., Alex01, VIP777) to ensure it is unique on the server.'
      };
    }

    const nameLower = rawName.toLowerCase();

    // Rule: Check global uniqueness across server database
    try {
      const damiSnap = await getDocs(collection(db, DAMI_COLLECTION));
      let alreadyExists = false;
      damiSnap.forEach((d) => {
        const data = d.data();
        if (data.nameLower === nameLower || (data.name && data.name.toLowerCase() === nameLower)) {
          alreadyExists = true;
        }
      });

      if (alreadyExists) {
        return {
          success: false,
          message: `The Dami Account name "${rawName}" is already taken in the system. Please use different numbers.`
        };
      }
    } catch (err) {
      console.warn('Dami uniqueness check warning:', err);
    }

    // Build participant list
    // Private: only creator
    // Public: creator + only connected contacts that creator explicitly selected
    const participantIds = params.type === 'private'
      ? [params.currentUser.uid]
      : Array.from(new Set([params.currentUser.uid, ...(params.memberIds || [])]));

    const participantNames: Record<string, string> = {
      [params.currentUser.uid]: params.currentUser.displayName,
      ...(params.memberNames || {})
    };

    const participantPhotos: Record<string, string> = {
      [params.currentUser.uid]: params.currentUser.photoURL || '',
      ...(params.memberPhotos || {})
    };

    try {
      const now = new Date().toISOString();

      // 1. Create linked channel in channels collection
      const channelsCol = collection(db, CHANNELS_COLLECTION);
      const channelDoc = await addDoc(channelsCol, {
        name: rawName,
        description: params.description || `${params.type === 'private' ? 'Private' : 'Public'} Dami Account`,
        isGroup: true,
        isDami: true,
        damiType: params.type,
        damiCreatorId: params.currentUser.uid,
        participantIds,
        participantNames,
        participantPhotos,
        createdBy: params.currentUser.uid,
        avatarIcon: params.avatarUrl || 'shield',
        lastMessageText: params.type === 'private' ? 'Private Dami space created' : 'Public Dami account created',
        lastMessageTime: now,
        lastMessageSenderId: params.currentUser.uid
      });

      // Add starter greeting message
      const messagesCol = collection(db, CHANNELS_COLLECTION, channelDoc.id, 'messages');
      await addDoc(messagesCol, {
        channelId: channelDoc.id,
        senderId: params.currentUser.uid,
        senderName: rawName,
        senderPhoto: params.avatarUrl || '',
        text: params.type === 'private'
          ? `Welcome to your Private Dami Account [${rawName}]. Only you have access to this space.`
          : `Welcome to Public Dami Account [${rawName}]! Added members can now chat together here.`,
        mediaType: 'text',
        readBy: [params.currentUser.uid],
        createdAt: now
      });

      // Generate unique HTTP API Token
      const apiToken = 'dami_tok_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      const defaultPermissions = ['read_messages', 'send_messages', 'send_media', 'read_info'];

      // 2. Create record in dami_accounts collection
      const damiCol = collection(db, DAMI_COLLECTION);
      const damiDocRef = await addDoc(damiCol, {
        name: rawName,
        nameLower,
        type: params.type,
        creatorId: params.currentUser.uid,
        creatorName: params.currentUser.displayName,
        creatorPhoto: params.currentUser.photoURL || '',
        creatorQid: (params.currentUser.qid || '').replace(/^@+/, ''),
        description: params.description || '',
        avatarUrl: params.avatarUrl || '',
        memberIds: participantIds,
        memberNames: participantNames,
        memberPhotos: participantPhotos,
        channelId: channelDoc.id,
        apiToken,
        apiPermissions: defaultPermissions,
        createdAt: now,
        updatedAt: now
      });

      // Update channel with damiId
      await updateDoc(doc(db, CHANNELS_COLLECTION, channelDoc.id), {
        damiId: damiDocRef.id
      });

      const newDami: DamiAccount = {
        id: damiDocRef.id,
        name: rawName,
        nameLower,
        type: params.type,
        creatorId: params.currentUser.uid,
        creatorName: params.currentUser.displayName,
        creatorPhoto: params.currentUser.photoURL || '',
        creatorQid: (params.currentUser.qid || '').replace(/^@+/, ''),
        description: params.description || '',
        avatarUrl: params.avatarUrl || '',
        memberIds: participantIds,
        memberNames: participantNames,
        memberPhotos: participantPhotos,
        channelId: channelDoc.id,
        apiToken,
        apiPermissions: defaultPermissions,
        createdAt: now,
        updatedAt: now
      };

      return {
        success: true,
        message: `${params.type === 'private' ? 'Private' : 'Public'} Dami Account "${rawName}" created successfully!`,
        damiAccount: newDami,
        channelId: channelDoc.id
      };
    } catch (error) {
      console.error('Error creating Dami Account:', error);
      return { success: false, message: 'Failed to create Dami Account. Please check connection and try again.' };
    }
  },

  // 12. Subscribe to Dami Accounts for current user
  subscribeUserDamiAccounts(
    userId: string,
    callback: (accounts: DamiAccount[]) => void
  ): Unsubscribe {
    if (!userId) {
      callback([]);
      return () => {};
    }

    try {
      const damiCol = collection(db, DAMI_COLLECTION);
      return onSnapshot(
        damiCol,
        (snap) => {
          const list: DamiAccount[] = [];
          snap.forEach((d) => {
            const data = { id: d.id, ...d.data() } as DamiAccount;
            // Return if:
            // 1. Current user is the creator (sees both private & public)
            // 2. OR is public AND current user is in memberIds
            if (
              data.creatorId === userId ||
              (data.type === 'public' && data.memberIds && data.memberIds.includes(userId))
            ) {
              // Ensure token exists for API HTTP access
              if (!data.apiToken && data.creatorId === userId) {
                const genToken = 'dami_tok_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
                data.apiToken = genToken;
                updateDoc(doc(db, DAMI_COLLECTION, d.id), { apiToken: genToken }).catch(() => {});
              }
              if (!data.apiPermissions) {
                data.apiPermissions = ['read_messages', 'send_messages', 'send_media', 'read_info'];
              }
              list.push(data);
            }
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          callback(list);
        },
        (err) => {
          console.warn('Error subscribing to dami accounts:', err);
          callback([]);
        }
      );
    } catch {
      return () => {};
    }
  },

  // Regenerate API Token for a Dami Account
  async regenerateDamiApiToken(damiId: string): Promise<string> {
    const newToken = 'dami_tok_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    try {
      const damiRef = doc(db, DAMI_COLLECTION, damiId);
      await updateDoc(damiRef, {
        apiToken: newToken,
        updatedAt: new Date().toISOString()
      });
      return newToken;
    } catch (err) {
      console.error('Error regenerating token:', err);
      throw err;
    }
  },

  // Update Access Permissions for a Dami API Token
  async updateDamiPermissions(damiId: string, permissions: string[]): Promise<void> {
    try {
      const damiRef = doc(db, DAMI_COLLECTION, damiId);
      await updateDoc(damiRef, {
        apiPermissions: permissions,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating dami permissions:', err);
      throw err;
    }
  },

  // Update Outbound Webhook URL for a Dami Account
  async updateDamiWebhookUrl(damiId: string, webhookUrl: string): Promise<boolean> {
    try {
      const damiRef = doc(db, DAMI_COLLECTION, damiId);
      await updateDoc(damiRef, {
        webhookUrl: webhookUrl.trim(),
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.error('Error updating dami webhook URL:', err);
      return false;
    }
  },

  // 13. Update members of a Public Dami Account
  async updateDamiAccountMembers(
    damiId: string,
    channelId: string,
    memberIds: string[],
    memberNames: Record<string, string>,
    memberPhotos: Record<string, string>
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const damiRef = doc(db, DAMI_COLLECTION, damiId);
      await updateDoc(damiRef, {
        memberIds,
        memberNames,
        memberPhotos,
        updatedAt: now
      });

      if (channelId) {
        const chanRef = doc(db, CHANNELS_COLLECTION, channelId);
        await updateDoc(chanRef, {
          participantIds: memberIds,
          participantNames: memberNames,
          participantPhotos: memberPhotos
        });
      }
      return true;
    } catch (err) {
      console.error('Error updating dami members:', err);
      return false;
    }
  },

  // 14. Delete a Dami Account
  async deleteDamiAccount(damiId: string, channelId: string, currentUserId: string): Promise<boolean> {
    try {
      const damiRef = doc(db, DAMI_COLLECTION, damiId);
      const damiSnap = await getDoc(damiRef);
      if (damiSnap.exists()) {
        const data = damiSnap.data();
        if (data.creatorId !== currentUserId) {
          return false; // Only creator can delete
        }
      }

      await deleteDoc(damiRef);

      if (channelId) {
        const chanRef = doc(db, CHANNELS_COLLECTION, channelId);
        await deleteDoc(chanRef);
      }
      return true;
    } catch (err) {
      console.error('Error deleting Dami Account:', err);
      return false;
    }
  },

  // 15. Search Public Dami Accounts by name
  async searchDamiAccounts(searchQuery: string, currentUserId: string): Promise<DamiAccount[]> {
    try {
      const cleanLower = searchQuery.trim().toLowerCase().replace(/^@+/, '');
      if (!cleanLower) return [];

      const damiSnap = await getDocs(collection(db, DAMI_COLLECTION));
      const results: DamiAccount[] = [];

      damiSnap.forEach((d) => {
        const data = { id: d.id, ...d.data() } as DamiAccount;
        const dNameLower = (data.nameLower || data.name || '').toLowerCase();
        if (dNameLower.includes(cleanLower)) {
          // If private: ONLY return if creator is currentUserId
          if (data.type === 'private' && data.creatorId !== currentUserId) {
            return;
          }
          results.push(data);
        }
      });
      return results;
    } catch {
      return [];
    }
  }
};
