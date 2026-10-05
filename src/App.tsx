import { useState, useEffect, useRef, useMemo } from 'react';
import {
  auth,
  onAuthStateChanged,
  testConnection,
  reload,
  type FirebaseUser
} from './firebase.ts';
import { chatService } from './services/chatService.ts';
import { soundService } from './services/soundService.ts';
import { liveLocationTracker } from './services/liveLocationTracker.ts';
import { PhoneFrame } from './components/PhoneFrame.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatArea } from './components/ChatArea.tsx';
import { LoginView } from './components/LoginView.tsx';
import { EmailVerificationView } from './components/EmailVerificationView.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { UserProfileModal } from './components/UserProfileModal.tsx';
import { AddMemberModal } from './components/AddMemberModal.tsx';
import { BlockedUsersModal } from './components/BlockedUsersModal.tsx';
import { DamiManagerModal } from './components/DamiManagerModal.tsx';
import { AppMenuDrawer } from './components/AppMenuDrawer.tsx';
import type { UserProfile, Channel, Message, MemberRequest, BlockedUserRecord, DamiAccount, LocationData, ContactData } from './types.ts';
import { cleanAvatarUrl } from './utils/avatarUtils.ts';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'requests'>('chats');

  // Member requests state
  const [incomingRequests, setIncomingRequests] = useState<MemberRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<MemberRequest[]>([]);

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserRecord[]>([]);

  // Mobile navigation state: show sidebar or active chat
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  // Modals & Menu
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [isDamiModalOpen, setIsDamiModalOpen] = useState(false);
  const [damiAccounts, setDamiAccounts] = useState<DamiAccount[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Sound trigger on new message reference
  const prevMessagesCountRef = useRef<number>(0);

  // 1. Initial boot: Test Firebase connection as required by Firebase skill
  useEffect(() => {
    testConnection();
  }, []);

  // 2. Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);

      if (user) {
        let cachedProfile: Partial<UserProfile> = {};
        try {
          const saved = localStorage.getItem(`qchat_profile_${user.uid}`);
          if (saved) cachedProfile = JSON.parse(saved);
        } catch {
          // ignore
        }

        const isVerifiedSession =
          localStorage.getItem(`qchat_verified_${user.uid}`) === 'true' ||
          Boolean(cachedProfile.emailVerified) ||
          user.emailVerified ||
          user.providerData.some((p) => p.providerId === 'google.com');

        if (isVerifiedSession) {
          try {
            localStorage.setItem(`qchat_verified_${user.uid}`, 'true');
          } catch {
            // ignore
          }
        }

        const newProfile: UserProfile = {
          uid: user.uid,
          qid: cachedProfile.qid || user.email?.split('@')[0] || user.uid.slice(0, 8),
          displayName: cachedProfile.displayName || user.displayName || 'User',
          email: user.email || '',
          emailVerified: isVerifiedSession,
          phoneNumber: cachedProfile.phoneNumber || user.phoneNumber || '',
          photoURL: cleanAvatarUrl(
            cachedProfile.photoURL || user.photoURL,
            cachedProfile.displayName || user.displayName
          ),
          statusText: cachedProfile.statusText || 'Active on QChat',
          isOnline: true,
          createdAt: cachedProfile.createdAt || new Date().toISOString()
        };

        setCurrentUser(newProfile);
        chatService.saveUserProfile(newProfile);

        // Fetch persisted Firestore document to sync custom qid and phone
        chatService.getUserProfile(user.uid).then((docProfile) => {
          if (docProfile) {
            const docVerified = docProfile.emailVerified !== false || isVerifiedSession;
            if (docVerified) {
              try {
                localStorage.setItem(`qchat_verified_${user.uid}`, 'true');
              } catch {
                // ignore
              }
            }
            const cleanDoc = {
              ...docProfile,
              emailVerified: docVerified,
              photoURL: cleanAvatarUrl(docProfile.photoURL, docProfile.displayName)
            };
            setCurrentUser((prev) => (prev ? { ...prev, ...cleanDoc, isOnline: true } : cleanDoc));
            try {
              localStorage.setItem(`qchat_profile_${user.uid}`, JSON.stringify(cleanDoc));
            } catch {
              // ignore
            }
          }
        }).catch(() => {});
      } else {
        setCurrentUser(null);
        setChannels([]);
        setMessages([]);
        setActiveChannelId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Check if current user is email verified (Google login is always auto-verified, password users require verification only ONCE until logout)
  const isEmailVerified = Boolean(
    firebaseUser &&
      (firebaseUser.emailVerified ||
        currentUser?.emailVerified ||
        (firebaseUser.uid && localStorage.getItem(`qchat_verified_${firebaseUser.uid}`) === 'true') ||
        (currentUser?.uid && localStorage.getItem(`qchat_verified_${currentUser.uid}`) === 'true') ||
        firebaseUser.providerData.some((p) => p.providerId === 'google.com'))
  );

  // 3. Save profile and update online status only when authenticated and verified
  useEffect(() => {
    if (!currentUser?.uid || !firebaseUser || !isEmailVerified) return;

    chatService.setUserOnlineStatus(currentUser.uid, true);

    const handleBeforeUnload = () => {
      chatService.setUserOnlineStatus(currentUser.uid, false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.uid, firebaseUser, isEmailVerified]);

  // 4. Subscribe to Channels & seed default rooms only when authenticated and verified
  useEffect(() => {
    if (!firebaseUser || !currentUser?.uid || !isEmailVerified) {
      setChannels([]);
      return;
    }

    const unsubChannels = chatService.subscribeChannels((channelList) => {
      setChannels(channelList);
      if (channelList.length > 0) {
        setActiveChannelId((prev) =>
          prev && channelList.some((c) => c.id === prev) ? prev : channelList[0].id
        );
      }
    });

    chatService.seedDefaultChannels(currentUser.uid);

    return () => unsubChannels();
  }, [firebaseUser, currentUser?.uid, isEmailVerified]);

  // 5. Subscribe to all Users only when authenticated and verified
  useEffect(() => {
    if (!firebaseUser || !isEmailVerified) {
      setOnlineUsers([]);
      return;
    }

    const unsubUsers = chatService.subscribeUsers((users) => {
      setOnlineUsers(users);
    });

    return () => unsubUsers();
  }, [firebaseUser, isEmailVerified]);

  // 5.1 Subscribe to Member Requests (incoming & sent)
  useEffect(() => {
    if (!firebaseUser || !currentUser?.uid || !isEmailVerified) {
      setIncomingRequests([]);
      setSentRequests([]);
      return;
    }

    const unsubIncoming = chatService.subscribeIncomingRequests(
      currentUser.uid,
      (reqs) => setIncomingRequests(reqs)
    );

    const unsubSent = chatService.subscribeSentRequests(
      currentUser.uid,
      (reqs) => setSentRequests(reqs)
    );

    return () => {
      unsubIncoming();
      unsubSent();
    };
  }, [firebaseUser, currentUser?.uid, isEmailVerified]);

  // 5.2 Subscribe to Blocked Users only when authenticated
  useEffect(() => {
    if (!firebaseUser || !currentUser?.uid) {
      setBlockedUsers([]);
      return;
    }
    const unsubBlocked = chatService.subscribeBlockedUsers(currentUser.uid, (list) => {
      setBlockedUsers(list);
    });
    return () => unsubBlocked();
  }, [firebaseUser, currentUser?.uid]);

  // 5.3 Subscribe to Dami Accounts for current user
  useEffect(() => {
    if (!firebaseUser || !currentUser?.uid) {
      setDamiAccounts([]);
      return;
    }
    const unsubDami = chatService.subscribeUserDamiAccounts(currentUser.uid, (list) => {
      setDamiAccounts(list);
    });
    return () => unsubDami();
  }, [firebaseUser, currentUser?.uid]);

  // Connected contacts (only these can be added to a Public Dami Account)
  const connectedContacts = useMemo(() => {
    if (!currentUser) return [];
    const contactMap = new Map<string, UserProfile>();
    channels.forEach((ch) => {
      if (!ch.isGroup && ch.participantIds) {
        const otherId = ch.participantIds.find((id) => id !== currentUser.uid);
        if (otherId) {
          const name = ch.participantNames?.[otherId] || ch.name;
          const photo = ch.participantPhotos?.[otherId] || '';
          contactMap.set(otherId, {
            uid: otherId,
            displayName: name,
            email: '',
            photoURL: photo,
            isOnline: onlineUsers.some((u) => u.uid === otherId && u.isOnline),
            createdAt: ''
          });
        }
      }
    });
    return Array.from(contactMap.values());
  }, [currentUser, channels, onlineUsers]);

  // 6. Subscribe to Messages of the active channel only when authenticated and verified
  useEffect(() => {
    if (!firebaseUser || !activeChannelId || !isEmailVerified) {
      setMessages([]);
      return;
    }

    const unsubMessages = chatService.subscribeMessages(activeChannelId, (incomingMessages) => {
      if (
        incomingMessages.length > prevMessagesCountRef.current &&
        prevMessagesCountRef.current > 0
      ) {
        const lastMsg = incomingMessages[incomingMessages.length - 1];
        if (lastMsg && lastMsg.senderId !== currentUser?.uid) {
          soundService.playReceivedSound();
        }
      }
      prevMessagesCountRef.current = incomingMessages.length;
      setMessages(incomingMessages);
    });

    return () => unsubMessages();
  }, [activeChannelId, firebaseUser, currentUser?.uid, isEmailVerified]);

  // Handle Channel Selection
  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    setMobileView('chat');
  };

  // Handle sending a message
  const handleSendMessage = async (content: {
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
  }) => {
    if (!activeChannelId || !currentUser) return;
    const msgId = await chatService.sendMessage(activeChannelId, {
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      senderPhoto: currentUser.photoURL,
      text: content.text,
      mediaType: content.mediaType,
      mediaUrl: content.mediaUrl,
      mediaDuration: content.mediaDuration,
      fileName: content.fileName,
      fileSize: content.fileSize,
      locationData: content.locationData,
      contactData: content.contactData,
      expiresAt: content.expiresAt,
      isOneTime: content.isOneTime
    });

    // If Live Location, initiate real-time GPS tracking until expiry or manually stopped
    if (msgId && content.locationData?.isLive && (content.locationData.isAllTime || content.locationData.liveUntil)) {
      liveLocationTracker.startTracking(activeChannelId, msgId, content.locationData.liveUntil, content.locationData.isAllTime);
    }
  };

  // Handle stopping live location sharing
  const handleStopLiveLocation = (messageId: string) => {
    if (!activeChannelId) return;
    liveLocationTracker.stopTracking(activeChannelId, messageId, true);
  };

  // Handle toggling reaction
  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!activeChannelId || !currentUser) return;
    chatService.toggleReaction(activeChannelId, messageId, emoji, currentUser.uid);
  };

  // Handle deleting a message
  const handleDeleteMessage = (messageId: string) => {
    if (!activeChannelId) return;
    chatService.deleteMessage(activeChannelId, messageId);
  };

  // Handle deleting a message for everyone
  const handleDeleteMessageForEveryone = (messageId: string) => {
    if (!activeChannelId) return;
    chatService.deleteMessageForEveryone(activeChannelId, messageId);
  };

  // Handle deleting a message for current user only
  const handleDeleteMessageForMe = (messageId: string) => {
    if (!activeChannelId || !currentUser) return;
    chatService.deleteMessageForMe(activeChannelId, messageId, currentUser.uid);
  };

  // Handle editing a message (within 30 minutes)
  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!activeChannelId) return;
    await chatService.editMessage(activeChannelId, messageId, newText);
  };

  // Handle updating user profile
  const handleSaveProfile = (updated: UserProfile) => {
    setCurrentUser(updated);
    if (updated.uid) {
      localStorage.setItem(`qchat_profile_${updated.uid}`, JSON.stringify(updated));
      chatService.saveUserProfile(updated);
    }
  };

  // Handle account profile selection from modal
  const handleSelectAccount = (profile: UserProfile) => {
    setCurrentUser(profile);
    if (profile.uid) {
      localStorage.setItem(`qchat_profile_${profile.uid}`, JSON.stringify(profile));
      chatService.saveUserProfile(profile);
    }
  };

  // Handle accepting a member request
  const handleAcceptRequest = async (req: MemberRequest) => {
    if (!currentUser) return;
    const channelId = await chatService.acceptMemberRequest(req, currentUser);
    if (channelId) {
      setActiveChannelId(channelId);
      setMobileView('chat');
      setSidebarTab('chats');
    }
  };

  // Handle declining a member request
  const handleDeclineRequest = async (requestId: string) => {
    await chatService.declineMemberRequest(requestId);
  };

  // Handle starting or opening a direct chat with a contact
  const handleStartDirectChat = async (contact: UserProfile) => {
    if (!currentUser) return;
    // Check if a direct chat with this contact already exists
    const existing = channels.find(
      (c) =>
        !c.isGroup &&
        c.participantIds &&
        c.participantIds.includes(currentUser.uid) &&
        c.participantIds.includes(contact.uid)
    );

    if (existing) {
      setActiveChannelId(existing.id);
      setMobileView('chat');
      return;
    }

    // Otherwise create a new direct conversation
    const newId = await chatService.createChannel({
      name: contact.displayName,
      description: `Direct conversation with ${contact.displayName}`,
      isGroup: false,
      participantIds: [currentUser.uid, contact.uid],
      avatarIcon: 'user',
      createdBy: currentUser.uid
    });
    if (newId) {
      setActiveChannelId(newId);
      setMobileView('chat');
    }
  };

  // Delete channel/chat connection
  const handleDeleteChannel = async (channelId: string, otherUserId?: string) => {
    if (!currentUser) return;
    const ok = await chatService.deleteMemberChat(channelId, currentUser.uid, otherUserId);
    if (ok) {
      if (activeChannelId === channelId) {
        setActiveChannelId(null);
        setMobileView('sidebar');
      }
    }
  };

  // Block member
  const handleBlockUser = async (targetUser: {
    uid: string;
    displayName: string;
    photoURL?: string;
    qid?: string;
    email?: string;
  }) => {
    if (!currentUser) return;
    await chatService.blockUser(currentUser, targetUser);
  };

  // Unblock member
  const handleUnblockUser = async (targetUserId: string) => {
    if (!currentUser) return;
    await chatService.unblockUser(currentUser.uid, targetUserId);
  };

  // 1. Loading screen
  if (authLoading) {
    return (
      <PhoneFrame activeChannelName="Connecting...">
        <div className="flex-1 w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-bold text-slate-200">
            Starting <span className="notranslate" translate="no">QChat</span>...
          </p>
          <p className="text-xs text-slate-400 mt-1">Connecting to real-time server...</p>
        </div>
      </PhoneFrame>
    );
  }

  // 2. Unauthenticated screen: Show Login Screen
  if (!firebaseUser || !currentUser) {
    return (
      <PhoneFrame activeChannelName="Login">
        <LoginView />
      </PhoneFrame>
    );
  }

  // 2.1 Unverified Email check: User must verify email before entering chat
  if (!isEmailVerified) {
    return (
      <PhoneFrame activeChannelName="Verify Email">
        <EmailVerificationView
          user={firebaseUser}
          onVerified={async () => {
            if (auth.currentUser) {
              await reload(auth.currentUser);
              setFirebaseUser({ ...auth.currentUser });
            }
          }}
        />
      </PhoneFrame>
    );
  }

  const activeChannel = channels.find((c) => c.id === activeChannelId) || null;

  // 3. Authenticated: Render Full Chat Application
  return (
    <PhoneFrame
      activeChannelName={activeChannel?.name}
      onOpenMenu={() => setIsMenuOpen(true)}
      currentUser={currentUser}
      hideTopBar={mobileView === 'chat'}
    >
      <div className="flex-1 h-full w-full flex overflow-hidden relative bg-slate-950">
        {/* Pure Mobile App View: Either Chat List (Sidebar) OR Full Chat View */}
        {mobileView === 'sidebar' ? (
          <div className="h-full w-full flex flex-col shrink-0">
            <Sidebar
              channels={channels}
              activeChannelId={activeChannelId}
              onSelectChannel={handleSelectChannel}
              currentUser={currentUser}
              onlineUsers={onlineUsers}
              incomingRequests={incomingRequests}
              blockedUsers={blockedUsers}
              onOpenAddMember={() => setIsAddMemberModalOpen(true)}
              onAcceptRequest={handleAcceptRequest}
              onDeclineRequest={handleDeclineRequest}
              onDeleteChannel={handleDeleteChannel}
              onBlockUser={handleBlockUser}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onOpenProfile={() => setIsProfileModalOpen(true)}
              onOpenMenu={() => setIsMenuOpen(true)}
              tab={sidebarTab}
              onTabChange={setSidebarTab}
            />
          </div>
        ) : (
          <div className="h-full w-full flex flex-col shrink-0">
            <ChatArea
              channel={activeChannel}
              messages={messages}
              currentUser={currentUser}
              onlineUsers={onlineUsers}
              blockedUsers={blockedUsers}
              onSendMessage={handleSendMessage}
              onReact={handleToggleReaction}
              onDeleteMessage={handleDeleteMessage}
              onDeleteForEveryone={handleDeleteMessageForEveryone}
              onDeleteForMe={handleDeleteMessageForMe}
              onEditMessage={handleEditMessage}
              onDeleteChannel={handleDeleteChannel}
              onBlockUser={handleBlockUser}
              onUnblockUser={handleUnblockUser}
              onStopLiveLocation={handleStopLiveLocation}
              onBackToSidebar={() => setMobileView('sidebar')}
              isMobileView={true}
            />
          </div>
        )}
      </div>

      {/* Master App Menu Drawer: Contains all functions */}
      <AppMenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentUser={currentUser}
        onlineUsers={onlineUsers}
        channels={channels}
        blockedUsers={blockedUsers}
        onOpenBlockedModal={() => setIsBlockedModalOpen(true)}
        onOpenDamiManager={() => setIsDamiModalOpen(true)}
        damiAccountsCount={damiAccounts.length}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenAddMember={() => setIsAddMemberModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onStartDirectChat={handleStartDirectChat}
        onSelectChannel={handleSelectChannel}
        activeTab={sidebarTab}
        onSetTab={setSidebarTab}
      />

      {/* Global Modals */}
      <AuthModal
        currentUser={currentUser}
        firebaseUser={firebaseUser}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSelectProfile={handleSelectAccount}
      />

      <UserProfileModal
        currentUser={currentUser}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleSaveProfile}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        currentUser={currentUser}
        incomingRequests={incomingRequests}
        sentRequests={sentRequests}
        onAcceptRequest={handleAcceptRequest}
        onDeclineRequest={handleDeclineRequest}
        onSuccessOpenChat={(newChId) => {
          setActiveChannelId(newChId);
          setMobileView('chat');
        }}
      />

      <BlockedUsersModal
        isOpen={isBlockedModalOpen}
        onClose={() => setIsBlockedModalOpen(false)}
        blockedUsers={blockedUsers}
        onUnblock={handleUnblockUser}
      />

      {/* Your Dami Manager Modal */}
      <DamiManagerModal
        isOpen={isDamiModalOpen}
        onClose={() => setIsDamiModalOpen(false)}
        currentUser={currentUser}
        damiAccounts={damiAccounts}
        connectedContacts={connectedContacts}
        onOpenDamiChat={(newChId) => {
          setActiveChannelId(newChId);
          setMobileView('chat');
        }}
      />
    </PhoneFrame>
  );
}
