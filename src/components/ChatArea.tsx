import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Channel, Message, UserProfile, BlockedUserRecord, LocationData, ContactData } from '../types.ts';
import { MessageItem } from './MessageItem.tsx';
import { chatService } from '../services/chatService.ts';
import { soundService } from '../services/soundService.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { cleanAvatarUrl, compressImageFile } from '../utils/avatarUtils.ts';
import { localMediaCache } from '../services/localMediaCache.ts';
import { WhatsAppAttachmentMenu } from './WhatsAppAttachmentMenu.tsx';
import { EmojiGifStickerDrawer } from './EmojiGifStickerDrawer.tsx';
import { LocationShareModal } from './LocationShareModal.tsx';
import { ContactShareModal } from './ContactShareModal.tsx';
import { LiveCameraModal } from './LiveCameraModal.tsx';
import { AntiScreenshotShield } from './AntiScreenshotShield.tsx';
import {
  Send,
  Image as ImageIcon,
  Mic,
  X,
  Search,
  Volume2,
  VolumeX,
  ArrowLeft,
  Sparkles,
  Hash,
  Bell,
  Zap,
  Star,
  Briefcase,
  Bookmark,
  Shield,
  Compass,
  Users,
  User,
  UserCheck,
  UserX,
  MessageSquare,
  MoreVertical,
  Trash2,
  Ban,
  ShieldCheck,
  HardDrive,
  Paperclip,
  Smile,
  Camera,
  FileText,
  Film,
  Headphones,
  MapPin,
  File as FileIcon
} from 'lucide-react';

interface ChatAreaProps {
  channel: Channel | null;
  messages: Message[];
  currentUser: UserProfile;
  onlineUsers?: UserProfile[];
  blockedUsers?: BlockedUserRecord[];
  onSendMessage: (data: {
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
  }) => void;
  onReact: (messageId: string, emoji: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onBackToSidebar: () => void;
  onDeleteChannel?: (channelId: string, otherUserId?: string) => Promise<void> | void;
  onBlockUser?: (targetUser: { uid: string; displayName: string; photoURL?: string; qid?: string; email?: string }) => Promise<void> | void;
  onUnblockUser?: (targetUserId: string) => Promise<void> | void;
  onStopLiveLocation?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newText: string) => Promise<void> | void;
  isMobileView: boolean;
}

const PRESET_STICKERS = [
  { name: 'Awesome!', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=300&auto=format&fit=crop&q=80' },
  { name: 'Congrats!', url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=300&auto=format&fit=crop&q=80' },
  { name: 'Coffee Time', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&auto=format&fit=crop&q=80' },
  { name: 'Work Mode', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&auto=format&fit=crop&q=80' }
];

const QUICK_PHRASES = [
  'How are you?',
  'I am doing great!',
  'Sounds good, thanks!',
  'Talk to you in a bit.',
  'Best regards!'
];

const renderChannelIcon = (c: Channel, sizeClass = 'w-5 h-5') => {
  if (c.avatarIcon === 'bell') return <Bell className={`${sizeClass} text-amber-500`} />;
  if (c.avatarIcon === 'zap') return <Zap className={`${sizeClass} text-yellow-500`} />;
  if (c.avatarIcon === 'star') return <Star className={`${sizeClass} text-amber-400`} />;
  if (c.avatarIcon === 'briefcase') return <Briefcase className={`${sizeClass} text-blue-500`} />;
  if (c.avatarIcon === 'users') return <Users className={`${sizeClass} text-emerald-500`} />;
  if (c.avatarIcon === 'bookmark') return <Bookmark className={`${sizeClass} text-indigo-500`} />;
  if (c.avatarIcon === 'shield') return <Shield className={`${sizeClass} text-cyan-500`} />;
  if (c.avatarIcon === 'compass') return <Compass className={`${sizeClass} text-violet-500`} />;
  if (c.avatarIcon === 'message') return <MessageSquare className={`${sizeClass} text-indigo-500`} />;
  if (c.avatarIcon === 'user' || !c.isGroup) return <User className={`${sizeClass} text-slate-400`} />;
  return <Hash className={`${sizeClass} text-indigo-500`} />;
};

export const ChatArea: React.FC<ChatAreaProps> = ({
  channel,
  messages,
  currentUser,
  onlineUsers = [],
  blockedUsers = [],
  onSendMessage,
  onReact,
  onDeleteMessage,
  onBackToSidebar,
  onDeleteChannel,
  onBlockUser,
  onUnblockUser,
  onStopLiveLocation,
  onDeleteForEveryone,
  onDeleteForMe,
  onEditMessage,
  isMobileView
}) => {
  const [inputText, setInputText] = useState('');
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{
    type: 'image' | 'video' | 'document' | 'file' | 'audio';
    dataUrl?: string;
    fileName: string;
    fileSize?: number;
    file?: File;
  } | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');

  // WhatsApp Attachment & Rich Media Drawers
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showLiveCameraModal, setShowLiveCameraModal] = useState(false);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [isOneTimeMode, setIsOneTimeMode] = useState(false);

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(soundService.isSoundEnabled());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [confirmBlockModal, setConfirmBlockModal] = useState(false);
  const { isDayMode } = useTheme();

  const textInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // gallery (photos & videos)
  const documentInputRef = useRef<HTMLInputElement>(null); // all files (doc, pdf, zip, etc.)
  const videoInputRef = useRef<HTMLInputElement>(null); // video files
  const audioInputRef = useRef<HTMLInputElement>(null); // audio files
  const nativeCameraInputRef = useRef<HTMLInputElement>(null); // direct mobile camera
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Close header 3-dots menu on ANY outside touch/click anywhere on screen (capture phase)
  useEffect(() => {
    if (!isHeaderMenuOpen) return;

    const handleGlobalTouchOrClick = (e: Event) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handleGlobalTouchOrClick, true);
    window.addEventListener('touchstart', handleGlobalTouchOrClick, true);
    window.addEventListener('click', handleGlobalTouchOrClick, true);

    return () => {
      window.removeEventListener('pointerdown', handleGlobalTouchOrClick, true);
      window.removeEventListener('touchstart', handleGlobalTouchOrClick, true);
      window.removeEventListener('click', handleGlobalTouchOrClick, true);
    };
  }, [isHeaderMenuOpen]);

  // Subscribe to real-time typing status in active channel
  useEffect(() => {
    if (!channel?.id || !currentUser?.uid) {
      setTypingUsers([]);
      return;
    }
    const unsub = chatService.subscribeTypingStatus(channel.id, currentUser.uid, (users) => {
      setTypingUsers(users);
    });
    return () => {
      unsub();
      if (channel?.id && currentUser?.uid) {
        chatService.setTypingStatus(channel.id, currentUser.uid, currentUser.displayName, false);
      }
    };
  }, [channel?.id, currentUser?.uid, currentUser?.displayName]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Determine recipients for the active channel
  const recipientIds = useMemo(() => {
    if (!channel) return [];
    const ids = (channel.participantIds || []).filter(
      (id) => id && id !== currentUser?.uid && id !== 'system'
    );
    if (ids.length > 0) return ids;

    // Direct chat fallback: match by contact display name
    const foundUser = onlineUsers.find(
      (u) => u.displayName.toLowerCase() === channel.name.toLowerCase() && u.uid !== currentUser?.uid
    );
    return foundUser ? [foundUser.uid] : [];
  }, [channel, currentUser?.uid, onlineUsers]);

  // List of active recipients who are currently online
  const onlineRecipients = useMemo(() => {
    return onlineUsers.filter(
      (u) => recipientIds.includes(u.uid) && u.isOnline
    );
  }, [recipientIds, onlineUsers]);

  const isRecipientOnline = onlineRecipients.length > 0;

  // Primary recipient for 1-to-1 direct conversation
  const primaryRecipient = useMemo(() => {
    if (channel?.isGroup) return null;
    if (recipientIds.length === 0) {
      // Fallback matching by channel name
      return onlineUsers.find(
        (u) => u.displayName.toLowerCase() === channel?.name.toLowerCase() && u.uid !== currentUser?.uid
      ) || null;
    }
    return onlineUsers.find((u) => u.uid === recipientIds[0]) || null;
  }, [channel?.isGroup, channel?.name, recipientIds, onlineUsers, currentUser?.uid]);

  // Check if current user has blocked this member
  const isBlockedByMe = useMemo(() => {
    if (!primaryRecipient) return false;
    return blockedUsers.some((b) => b.uid === primaryRecipient.uid);
  }, [primaryRecipient, blockedUsers]);

  // Automatically mark messages in the active channel as read by the current user
  useEffect(() => {
    if (!channel || !currentUser?.uid || messages.length === 0) return;

    const unreadIds = messages
      .filter((m) => !m.readBy || !m.readBy.includes(currentUser.uid))
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      chatService.markMessagesAsRead(channel.id, unreadIds, currentUser.uid);
    }
  }, [channel?.id, messages, currentUser?.uid]);

  // Automatically update message metadata when recipient is online
  useEffect(() => {
    if (!channel?.id || !currentUser?.uid || messages.length === 0 || !isRecipientOnline) {
      return;
    }

    const onlineRecipientIds = onlineRecipients.map((u) => u.uid);

    // Messages sent by currentUser where online recipient hasn't yet been recorded in readBy or status is not 'read'
    const pendingSentMsgIds = messages
      .filter((m) => {
        if (m.senderId !== currentUser.uid) return false;
        const readBy = m.readBy || [];
        const missingAnyOnline = onlineRecipientIds.some((rId) => !readBy.includes(rId));
        return m.status !== 'read' || missingAnyOnline;
      })
      .map((m) => m.id);

    if (pendingSentMsgIds.length > 0) {
      chatService.markMessagesAsReadByRecipients(
        channel.id,
        pendingSentMsgIds,
        onlineRecipientIds
      );
    }
  }, [channel?.id, messages, currentUser?.uid, isRecipientOnline, onlineRecipients]);

  // Ensure current user is tracked in channel participants
  useEffect(() => {
    if (channel && currentUser?.uid) {
      if (!channel.participantIds || !channel.participantIds.includes(currentUser.uid)) {
        chatService.joinChannel(channel.id, currentUser.uid);
      }
    }
  }, [channel?.id, currentUser?.uid]);

  // Check if active channel contains any one-time message
  const hasOneTimeMessage = useMemo(() => {
    return messages.some((m) => m.isOneTime && !m.isDeletedForEveryone);
  }, [messages]);

  // 1. Auto-Vanish One-Time Messages on Subsequent SMS:
  // When ANY subsequent message/sms is sent or arrives in this channel after a one-time message,
  // the previous one-time message vanishes from receiver's screen, and sender's bubble changes color!
  useEffect(() => {
    if (!channel?.id || !messages || messages.length <= 1) return;

    // Chronologically sorted messages
    const sorted = [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sorted.forEach((msg, idx) => {
      if (msg.isOneTime && !msg.isDeletedForEveryone) {
        // If there is ANY message in the conversation created after this one
        const hasSubsequentMessage = idx < sorted.length - 1;
        if (hasSubsequentMessage) {
          chatService.vanishOneTimeMessage(channel.id, msg.id);
        }
      }
    });
  }, [messages, channel?.id]);

  // 2. Vanish viewed one-time messages when user leaves or closes the chat
  useEffect(() => {
    return () => {
      if (!channel?.id || !messages) return;
      messages.forEach((msg) => {
        if (msg.isOneTime && msg.viewedBy && msg.viewedBy.length > 0) {
          chatService.vanishOneTimeMessage(channel.id, msg.id);
        }
      });
    };
  }, [channel?.id, messages]);

  // Allow toggling recipient online/offline status for testing read-receipts
  const handleToggleRecipientOnline = async () => {
    if (!primaryRecipient) return;
    const nextStatus = !primaryRecipient.isOnline;
    await chatService.setUserOnlineStatus(primaryRecipient.uid, nextStatus);
  };

  // Handle Voice recording simulator
  const handleStartVoice = () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    soundService.playReactionSound();
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handleStopVoice = (send: boolean) => {
    clearInterval(recordingTimerRef.current);
    if (send && recordingSeconds > 0) {
      soundService.playSentSound();
      onSendMessage({
        text: `Voice message (${recordingSeconds}s)`,
        mediaType: 'audio',
        mediaDuration: Math.max(recordingSeconds, 2),
        isOneTime: isOneTimeMode
      });
      setIsOneTimeMode(false);
    }
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    if (channel?.id && currentUser?.uid) {
      if (text.trim().length > 0) {
        chatService.setTypingStatus(channel.id, currentUser.uid, currentUser.displayName, true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          chatService.setTypingStatus(channel.id, currentUser.uid, currentUser.displayName, false);
        }, 2500);
      } else {
        chatService.setTypingStatus(channel.id, currentUser.uid, currentUser.displayName, false);
      }
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (channel?.id && currentUser?.uid) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      chatService.setTypingStatus(channel.id, currentUser.uid, currentUser.displayName, false);
    }

    soundService.playSentSound();
    onSendMessage({
      text: inputText.trim(),
      mediaType: 'text',
      isOneTime: isOneTimeMode
    });
    setInputText('');
    setIsOneTimeMode(false);
  };

  // Gallery click: check permission or open file picker
  const handlePhotoClick = () => {
    const perm = localMediaCache.getGalleryPermission();
    if (perm === 'granted') {
      fileInputRef.current?.click();
    } else {
      setShowPermissionDialog(true);
    }
  };

  const handleAllowPermission = () => {
    localMediaCache.setGalleryPermission('granted');
    setShowPermissionDialog(false);
    soundService.playReactionSound();
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  // Direct Camera click: check if mobile or desktop
  const handleCameraClick = () => {
    setShowAttachmentMenu(false);
    setShowEmojiDrawer(false);
    setShowLiveCameraModal(true);
  };

  // Gallery select (Photos or Videos)
  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setPendingMedia({
            type: 'video',
            dataUrl: reader.result as string,
            fileName: file.name,
            fileSize: file.size,
            file
          });
          setMediaCaption('');
        };
        reader.readAsDataURL(file);
      } else {
        const compressed = await compressImageFile(file, 1080, 0.82);
        setPendingMedia({
          type: 'image',
          dataUrl: compressed,
          fileName: file.name,
          fileSize: file.size
        });
        setMediaCaption('');
      }
    } catch (err) {
      console.error('Failed to compress/read image:', err);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Document (All files: PDF, DOCX, ZIP, TXT, APK, etc.)
  const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = () => {
        setPendingMedia({
          type: 'document',
          dataUrl: reader.result as string,
          fileName: file.name,
          fileSize: file.size,
          file
        });
        setMediaCaption('');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to read document:', err);
    } finally {
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
  };

  // Video direct select
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = () => {
        setPendingMedia({
          type: 'video',
          dataUrl: reader.result as string,
          fileName: file.name,
          fileSize: file.size,
          file
        });
        setMediaCaption('');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to read video file:', err);
    } finally {
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  // Audio file select
  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = () => {
        setPendingMedia({
          type: 'audio',
          dataUrl: reader.result as string,
          fileName: file.name,
          fileSize: file.size,
          file
        });
        setMediaCaption('');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to read audio file:', err);
    } finally {
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  // Mobile Native Camera capture
  const handleNativeCameraSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 1080, 0.82);
      setPendingMedia({
        type: 'image',
        dataUrl: compressed,
        fileName: file.name || `camera_${Date.now()}.jpg`,
        fileSize: file.size
      });
      setMediaCaption('');
    } catch (err) {
      console.error('Failed to read mobile camera photo:', err);
    } finally {
      if (nativeCameraInputRef.current) {
        nativeCameraInputRef.current.value = '';
      }
    }
  };

  // Live Camera snapshot capture
  const handleLiveCameraCapture = (dataUrl: string, fileName: string) => {
    setPendingMedia({
      type: 'image',
      dataUrl,
      fileName
    });
    setMediaCaption('');
  };

  // Send pending media (photo, video, document, audio)
  const handleSendPendingMedia = () => {
    if (!pendingMedia) return;
    const media = pendingMedia;
    const caption = mediaCaption.trim();
    setPendingMedia(null);
    setMediaCaption('');
    soundService.playSentSound();
    const expiresAt = media.type === 'image' ? Date.now() + 24 * 60 * 60 * 1000 : undefined;
    onSendMessage({
      text: caption,
      mediaType: media.type,
      mediaUrl: media.dataUrl,
      fileName: media.fileName,
      fileSize: media.fileSize,
      expiresAt,
      isOneTime: isOneTimeMode
    });
    setIsOneTimeMode(false);
  };

  // Location sending
  const handleSendLocation = (loc: LocationData) => {
    soundService.playSentSound();
    onSendMessage({
      text: loc.label || 'Shared Location',
      mediaType: 'location',
      locationData: loc,
      isOneTime: isOneTimeMode
    });
    setIsOneTimeMode(false);
  };

  // Contact sending
  const handleSendContact = (contact: ContactData) => {
    soundService.playSentSound();
    onSendMessage({
      text: `Contact: ${contact.name}`,
      mediaType: 'contact',
      contactData: contact,
      isOneTime: isOneTimeMode
    });
    setIsOneTimeMode(false);
  };

  // GIF sending
  const handleSendGif = (gifUrl: string, title?: string) => {
    soundService.playSentSound();
    onSendMessage({
      text: title || 'Shared a GIF',
      mediaType: 'gif',
      mediaUrl: gifUrl,
      isOneTime: isOneTimeMode
    });
    setIsOneTimeMode(false);
    setShowEmojiDrawer(false);
  };

  // Sticker sending
  const handleSendSticker = (stickerUrl: string, name?: string) => {
    soundService.playSentSound();
    onSendMessage({
      text: name || 'Shared a sticker',
      mediaType: 'sticker',
      mediaUrl: stickerUrl,
      isOneTime: isOneTimeMode
    });
    setIsOneTimeMode(false);
    setShowEmojiDrawer(false);
    setShowStickerModal(false);
  };

  // Emoji select: insert into text input
  const handleSelectEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };

  const handleToggleSound = () => {
    const updated = soundService.toggleSound();
    setSoundEnabled(updated);
  };

  if (!channel) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center p-6 text-center select-none transition-colors ${
          isDayMode ? 'bg-[#F1FAF5] text-slate-800' : 'bg-slate-950 text-slate-100'
        }`}
      >
        <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-3xl flex items-center justify-center mb-4 text-indigo-500 notranslate" translate="no">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold flex items-center gap-1.5">
          <span>Welcome to</span>
          <span className="text-indigo-600 notranslate" translate="no">QChat</span>
        </h3>
        <p className="text-xs opacity-70 max-w-xs mt-1.5 leading-relaxed">
          Select any chat or member from the sidebar to start messaging!
        </p>
      </div>
    );
  }

  const filteredMessages = useMemo(() => {
    // Exclude messages deleted by current user ("Delete for me")
    // AND completely exclude one-time messages that have vanished from the receiver if current user is the receiver!
    const visibleMessages = messages.filter((m) => {
      if (m.deletedForUsers && m.deletedForUsers.includes(currentUser.uid)) {
        return false;
      }
      if (m.isOneTime && m.vanishedFromReceiver && m.senderId !== currentUser.uid) {
        return false;
      }
      return true;
    });

    if (!searchQuery.trim()) return visibleMessages;
    const q = searchQuery.toLowerCase();
    return visibleMessages.filter(
      (m) =>
        m.text?.toLowerCase().includes(q) ||
        m.senderName?.toLowerCase().includes(q)
    );
  }, [messages, currentUser.uid, searchQuery]);

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden relative transition-colors ${
        isDayMode ? 'bg-[#F1FAF5] text-slate-800' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Active Screenshot & Recording Blocker when One-Time message is present */}
      <AntiScreenshotShield hasOneTimeContent={hasOneTimeMessage} />

      {/* Chat Top Bar */}
      <div
        className={`h-14 px-4 backdrop-blur border-b flex items-center justify-between shrink-0 z-20 transition-colors ${
          isDayMode ? 'bg-white/95 border-emerald-100' : 'bg-slate-900/90 border-slate-800'
        }`}
      >
        {/* Left Side: Back button + Avatar + Name + Status */}
        <div className="flex items-center space-x-2.5 min-w-0 flex-1 overflow-hidden mr-2">
          {/* Back button for mobile view */}
          {isMobileView && (
            <button
              onClick={onBackToSidebar}
              className="p-1.5 -ml-1 opacity-70 hover:opacity-100 rounded-lg hover:bg-black/10 transition-colors cursor-pointer shrink-0"
              title="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Member avatar */}
          <div className="relative shrink-0">
            <img
              src={cleanAvatarUrl(
                primaryRecipient?.photoURL || (channel.participantPhotos ? channel.participantPhotos[recipientIds[0] || ''] : null),
                primaryRecipient?.displayName || channel.name
              )}
              alt={primaryRecipient?.displayName || channel.name}
              className="w-9 h-9 rounded-full object-cover border border-indigo-500/40"
            />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-slate-900 rounded-full ${
                isRecipientOnline ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            ></span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5 min-w-0">
              <h3 className="font-bold text-sm truncate leading-tight">
                {primaryRecipient ? primaryRecipient.displayName : channel.name}
              </h3>
              {isOneTimeMode && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full border border-emerald-500 flex items-center justify-center text-[7px] font-black">1</span>
                  <span>1-Time Mode</span>
                </span>
              )}
            </div>
            {typingUsers.length > 0 ? (
              <p className="text-[11px] text-indigo-500 font-semibold truncate flex items-center gap-1.5 leading-tight animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping shrink-0"></span>
                <span className="truncate">{typingUsers.join(', ')} is typing...</span>
              </p>
            ) : isRecipientOnline ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center gap-1 leading-tight">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="truncate">Online</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1 leading-tight">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                <span className="truncate">Offline</span>
              </p>
            )}
          </div>
        </div>

        {/* Right action icons: responsive and clean */}
        <div className="flex items-center space-x-1 shrink-0">
          {primaryRecipient && (
            <button
              onClick={handleToggleRecipientOnline}
              className={`hidden md:flex px-2 py-1 rounded-xl border text-xs font-medium items-center space-x-1.5 transition-all cursor-pointer shadow-xs ${
                primaryRecipient.isOnline
                  ? isDayMode
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                  : isDayMode
                  ? 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Toggle online/offline status"
            >
              {primaryRecipient.isOnline ? (
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <UserX className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="text-[11px]">
                {primaryRecipient.isOnline ? 'Online' : 'Offline'}
              </span>
            </button>
          )}

          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              showSearch
                ? isDayMode ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                : 'opacity-70 hover:opacity-100 hover:bg-black/10'
            }`}
            title="Search in chat"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleSound}
            className="hidden sm:flex p-2 opacity-70 hover:opacity-100 rounded-xl hover:bg-black/10 transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 opacity-50" />}
          </button>

          {/* Chat options menu (Block & Delete) */}
          <div className="relative" ref={headerMenuRef}>
            <button
              onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isHeaderMenuOpen ? 'bg-black/10 dark:bg-white/10 opacity-100' : 'opacity-70 hover:opacity-100 hover:bg-black/10'
              }`}
              title="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isHeaderMenuOpen && (
              <>
                {/* Full-screen invisible backdrop so touching outside closes menu */}
                <div
                  className="fixed inset-0 z-30 bg-transparent"
                  onClick={() => setIsHeaderMenuOpen(false)}
                />

                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute right-0 top-10 z-40 w-56 rounded-2xl shadow-2xl border py-1.5 animate-in fade-in zoom-in-95 ${
                    isDayMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                >
                  {/* 1-Time View / Vanish Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsOneTimeMode((prev) => !prev);
                      soundService.playReactionSound();
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs flex items-center justify-between text-left transition-colors cursor-pointer border-b ${
                      isDayMode ? 'border-slate-100 hover:bg-slate-50' : 'border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${
                        isOneTimeMode
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                          : isDayMode ? 'border-slate-400 text-slate-600' : 'border-slate-600 text-slate-400'
                      }`}>
                        1
                      </span>
                      <div>
                        <div className="font-bold flex items-center gap-1.5 leading-tight">
                          <span>One-Time View Mode</span>
                          {isOneTimeMode && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          )}
                        </div>
                        <div className="text-[10px] opacity-70 leading-tight mt-0.5">
                          {isOneTimeMode ? 'Active (Vanishes for receiver)' : 'Disabled (Tap to enable)'}
                        </div>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors ${
                      isOneTimeMode ? 'bg-emerald-600 justify-end' : 'bg-slate-600/40 justify-start'
                    }`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform" />
                    </div>
                  </button>

                  {/* On small mobile: sound toggle */}
                  <button
                    onClick={() => {
                      handleToggleSound();
                      setIsHeaderMenuOpen(false);
                    }}
                    className={`sm:hidden w-full px-3 py-2 text-xs flex items-center space-x-2 text-left transition-colors cursor-pointer ${
                      isDayMode ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-500" /> : <VolumeX className="w-3.5 h-3.5 opacity-50" />}
                    <span>Sound: {soundEnabled ? 'On' : 'Off'}</span>
                  </button>

                  {/* Block/Unblock Member Option */}
                  {primaryRecipient && (
                    isBlockedByMe ? (
                      <button
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onUnblockUser?.(primaryRecipient.uid);
                        }}
                        className={`w-full px-3 py-2 text-xs flex items-center space-x-2 text-left transition-colors cursor-pointer ${
                          isDayMode ? 'hover:bg-emerald-50 text-emerald-600' : 'hover:bg-emerald-950/30 text-emerald-400'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Unblock Member</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          setConfirmBlockModal(true);
                        }}
                        className={`w-full px-3 py-2 text-xs flex items-center space-x-2 text-left transition-colors cursor-pointer ${
                          isDayMode ? 'hover:bg-rose-50 text-rose-600' : 'hover:bg-rose-950/30 text-rose-400'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Block Member</span>
                      </button>
                    )
                  )}

                  {/* Delete Chat Option */}
                  <button
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      setConfirmDeleteModal(true);
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center space-x-2 text-left transition-colors cursor-pointer ${
                      isDayMode ? 'hover:bg-rose-50 text-rose-600' : 'hover:bg-rose-950/30 text-rose-400'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Chat</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* In-chat Search Bar */}
      {showSearch && (
        <div
          className={`px-4 py-2 border-b flex items-center space-x-2 animate-in slide-in-from-top-2 duration-150 ${
            isDayMode ? 'bg-white border-emerald-100' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <Search className="w-4 h-4 opacity-50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-xs focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="opacity-60 hover:opacity-100 cursor-pointer" title="Clear">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-2 sm:py-3 space-y-1 relative scroll-smooth">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none opacity-70">
            <div
              className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-3 shadow-inner ${
                isDayMode ? 'bg-white border-emerald-200' : 'bg-slate-900 border-slate-800'
              }`}
            >
              {renderChannelIcon(channel, 'w-7 h-7')}
            </div>
            <h4 className="text-sm font-semibold">No messages yet</h4>
            <p className="text-xs opacity-70 max-w-xs mt-1">
              Start the conversation by sending a message or photo below!
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              channel={channel}
              isCurrentUser={msg.senderId === currentUser.uid}
              onReact={onReact}
              onDelete={onDeleteMessage}
              currentUserId={currentUser.uid}
              allUsers={onlineUsers}
              onStopLiveLocation={onStopLiveLocation}
              onDeleteForEveryone={onDeleteForEveryone}
              onDeleteForMe={onDeleteForMe}
              onEditMessage={onEditMessage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick response chips */}
      <div
        className={`px-3 sm:px-4 py-1.5 border-t flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 transition-colors ${
          isDayMode ? 'bg-white/70 border-emerald-100' : 'bg-slate-900/60 border-slate-800/80'
        }`}
      >
        <span className="text-[10px] opacity-60 font-semibold uppercase shrink-0 pl-1">
          Quick reply:
        </span>
        {QUICK_PHRASES.map((phrase, idx) => (
          <button
            key={idx}
            onClick={() => {
              soundService.playSentSound();
              onSendMessage({ text: phrase, mediaType: 'text' });
            }}
            className={`text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full border transition-colors shrink-0 cursor-pointer ${
              isDayMode
                ? 'bg-white hover:bg-emerald-50 text-slate-700 border-emerald-200 shadow-xs'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
            }`}
          >
            {phrase}
          </button>
        ))}
      </div>

      {/* Photo / Sticker Modal */}
      {showStickerModal && (
        <div
          className={`absolute bottom-16 left-3 right-3 sm:right-auto sm:w-80 rounded-2xl p-3 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150 border ${
            isDayMode ? 'bg-white border-emerald-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">Stickers & Photos</span>
            <button onClick={() => setShowStickerModal(false)} className="opacity-60 hover:opacity-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_STICKERS.map((stk, idx) => (
              <button
                key={idx}
                onClick={() => handleSendSticker(stk.url)}
                className="relative rounded-xl overflow-hidden group border border-slate-200 hover:border-indigo-500 transition-all aspect-video cursor-pointer"
              >
                <img src={stk.url} alt={stk.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-black/40 flex items-end p-1 text-[10px] font-medium text-white">
                  {stk.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input Bar or Blocked Banner */}
      {isBlockedByMe ? (
        <div
          className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
            isDayMode ? 'bg-rose-50/70 border-rose-200 text-slate-800' : 'bg-rose-950/20 border-rose-900/50 text-slate-100'
          }`}
        >
          <div className="flex items-center space-x-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                You have blocked this member
              </p>
              <p className="text-[11px] opacity-70">
                Unblock this member to send and receive messages
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (primaryRecipient && onUnblockUser) {
                onUnblockUser(primaryRecipient.uid);
              }
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-all shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Unblock Member</span>
          </button>
        </div>
      ) : (
        <div
          className={`px-3 sm:px-4 py-2.5 sm:py-3 backdrop-blur border-t shrink-0 transition-colors ${
            isDayMode ? 'bg-white/95 border-emerald-100' : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          {/* Native Hidden File Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,video/*"
            className="hidden"
            onChange={handleImageFileSelect}
          />
          <input
            type="file"
            ref={documentInputRef}
            className="hidden"
            onChange={handleDocumentSelect}
          />
          <input
            type="file"
            ref={videoInputRef}
            accept="video/*"
            className="hidden"
            onChange={handleVideoSelect}
          />
          <input
            type="file"
            ref={audioInputRef}
            accept="audio/*"
            className="hidden"
            onChange={handleAudioSelect}
          />
          <input
            type="file"
            ref={nativeCameraInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleNativeCameraSelect}
          />

          {/* Pending Media Direct Preview Bar (Image, Video, Document, Audio) */}
          {pendingMedia && (
            <div
              className={`p-2.5 rounded-2xl mb-2.5 border flex items-center gap-3 animate-in fade-in zoom-in-95 ${
                isDayMode
                  ? 'bg-[#F1FAF5] border-emerald-300/80 shadow-xs'
                  : 'bg-slate-900 border-slate-700/80 shadow-md'
              }`}
            >
              <div className="relative shrink-0">
                {pendingMedia.type === 'image' && pendingMedia.dataUrl ? (
                  <img
                    src={pendingMedia.dataUrl}
                    alt="Selected preview"
                    className="w-14 h-14 object-cover rounded-xl border border-indigo-500/50 shadow-sm"
                  />
                ) : pendingMedia.type === 'video' && pendingMedia.dataUrl ? (
                  <div className="w-14 h-14 rounded-xl bg-black flex items-center justify-center border border-sky-500/50 relative overflow-hidden">
                    <video src={pendingMedia.dataUrl} className="w-full h-full object-cover opacity-60" />
                    <Film className="w-6 h-6 text-white absolute" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-purple-600/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex flex-col items-center justify-center font-bold text-xs uppercase shadow-sm">
                    <FileText className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] truncate max-w-[48px]">
                      {pendingMedia.fileName.split('.').pop()?.slice(0, 4) || 'FILE'}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setPendingMedia(null)}
                  className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full cursor-pointer shadow-md transition-transform hover:scale-110"
                  title="Cancel attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                  {pendingMedia.type === 'image' && <HardDrive className="w-3.5 h-3.5 shrink-0" />}
                  {pendingMedia.type === 'video' && <Film className="w-3.5 h-3.5 shrink-0" />}
                  {pendingMedia.type === 'document' && <FileText className="w-3.5 h-3.5 shrink-0" />}
                  {pendingMedia.type === 'audio' && <Headphones className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">
                    {pendingMedia.fileName}
                    {pendingMedia.fileSize && (
                      <span className="opacity-75 font-normal ml-1">
                        ({pendingMedia.fileSize / 1024 < 1000
                          ? `${(pendingMedia.fileSize / 1024).toFixed(0)} KB`
                          : `${(pendingMedia.fileSize / (1024 * 1024)).toFixed(1)} MB`})
                      </span>
                    )}
                  </span>
                </div>
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendPendingMedia();
                    }
                  }}
                  placeholder="Add a caption (optional)..."
                  className={`w-full mt-1.5 px-3 py-1.5 text-xs rounded-xl border outline-none transition-colors ${
                    isDayMode
                      ? 'bg-white border-emerald-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                      : 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500'
                  }`}
                  autoFocus
                />
              </div>

              <button
                type="button"
                onClick={handleSendPendingMedia}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer shrink-0 transition-all active:scale-95"
                title="Send now"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isRecordingVoice ? (
            /* Live Voice Recording UI */
            <div className="flex items-center justify-between bg-red-950/40 border border-red-800/60 rounded-2xl px-4 py-2 animate-pulse">
              <div className="flex items-center space-x-3 text-red-400">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                <span className="text-xs font-semibold">Recording voice... (0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds})</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleStopVoice(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStopVoice(true)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl flex items-center space-x-1 cursor-pointer"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* WhatsApp-Style Input Bar matching exact WhatsApp screenshot */
            <div className="relative">
              {/* WhatsApp Attachment Menu popup */}
              <WhatsAppAttachmentMenu
                isOpen={showAttachmentMenu}
                onClose={() => setShowAttachmentMenu(false)}
                onSelectDocument={() => documentInputRef.current?.click()}
                onSelectCamera={handleCameraClick}
                onSelectGallery={handlePhotoClick}
                onSelectVideo={() => videoInputRef.current?.click()}
                onSelectAudio={() => audioInputRef.current?.click()}
                onSelectLocation={() => setShowLocationModal(true)}
                onSelectContact={() => setShowContactModal(true)}
                onSelectSticker={() => {
                  setShowEmojiDrawer(true);
                }}
              />

              <form onSubmit={handleSend} className="flex items-center gap-2">
                {/* 1. Left Pill Capsule (Emoji + Message Input + Paperclip + Camera) */}
                <div
                  className={`flex-1 flex items-center rounded-full px-3 py-1.5 min-h-[48px] border transition-colors shadow-xs ${
                    isDayMode
                      ? 'bg-white border-slate-200 text-slate-900 focus-within:border-emerald-500'
                      : 'bg-[#1f2c34] border-slate-700/60 text-slate-100 focus-within:border-emerald-500'
                  }`}
                >
                  {/* Emoji / Smile Drawer Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      setShowEmojiDrawer(!showEmojiDrawer);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-300 transition-colors shrink-0 cursor-pointer"
                    title="Emoji, GIF & Stickers"
                  >
                    <Smile className="w-6 h-6" />
                  </button>

                  {/* Text Input */}
                  <input
                    ref={textInputRef}
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Message"
                    className="flex-1 bg-transparent px-2.5 py-1 text-sm md:text-base border-none focus:outline-none placeholder-slate-400 min-w-0"
                  />

                  {/* Attachment Menu Button (📎 Paperclip) - Always visible inside capsule */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmojiDrawer(false);
                      setShowAttachmentMenu(!showAttachmentMenu);
                    }}
                    className={`p-1.5 transition-colors shrink-0 cursor-pointer ${
                      showAttachmentMenu
                        ? 'text-emerald-500'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                    title="Attach Document, Photo, Video, Location, Contact"
                  >
                    <Paperclip className="w-5 h-5 -rotate-45" />
                  </button>

                  {/* Camera Button (📷) - Only visible when input is empty! Disappears when typing starts! */}
                  {!inputText.trim() && (
                    <button
                      type="button"
                      onClick={handleCameraClick}
                      className="p-1.5 text-slate-400 hover:text-slate-300 transition-all shrink-0 cursor-pointer animate-in fade-in zoom-in-75 duration-150"
                      title="Camera (Photo / Video)"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* 2. Right Circular Action Button:
                    Transforms from Voice Mic button to Send button when user types! */}
                {inputText.trim() ? (
                  <button
                    type="submit"
                    className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30 transition-all cursor-pointer animate-in zoom-in-90 duration-150"
                    title="Send message"
                  >
                    <Send className="w-5 h-5 ml-0.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartVoice}
                    className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30 transition-all cursor-pointer animate-in zoom-in-90 duration-150"
                    title="Hold or tap to record voice note"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      )}

      {/* Emoji, GIF & Sticker Bottom Drawer */}
      <EmojiGifStickerDrawer
        isOpen={showEmojiDrawer}
        onClose={() => setShowEmojiDrawer(false)}
        onSelectEmoji={handleSelectEmoji}
        onSendGif={handleSendGif}
        onSendSticker={handleSendSticker}
      />

      {/* Location Share Modal */}
      <LocationShareModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSendLocation={handleSendLocation}
      />

      {/* Contact Share Modal */}
      <ContactShareModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        availableContacts={onlineUsers.filter((u) => u.uid !== currentUser.uid)}
        onSendContact={handleSendContact}
      />

      {/* Live Camera Modal */}
      <LiveCameraModal
        isOpen={showLiveCameraModal}
        onClose={() => setShowLiveCameraModal(false)}
        onCapturePhoto={handleLiveCameraCapture}
        onOpenNativeCamera={() => nativeCameraInputRef.current?.click()}
      />

      {/* Gallery Permission Request Dialog */}
      {showPermissionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowPermissionDialog(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
          />
          <div
            className={`relative z-10 w-full max-w-sm rounded-3xl p-6 border shadow-2xl transition-all animate-in zoom-in-95 text-center ${
              isDayMode ? 'bg-white border-emerald-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h4 className="font-black text-base">Gallery Permission Required</h4>
            <p className="text-xs opacity-75 mt-2 leading-relaxed">
              Allow access to your device gallery to send photos directly in chat and save incoming images.
            </p>

            <div className={`my-4 p-3 rounded-2xl text-left space-y-2 border text-xs ${
              isDayMode ? 'bg-[#F1FAF5] border-emerald-100 text-slate-700' : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <span><strong>Server Retention:</strong> Photos remain available on the server for 24 hours.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <span><strong>Device Storage:</strong> Photos are saved permanently to your device storage.</span>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowPermissionDialog(false)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  isDayMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAllowPermission}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer transition-all shadow-md shadow-emerald-600/25 active:scale-95"
              >
                Allow Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Chat Confirmation Dialog */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setConfirmDeleteModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
          />
          <div
            className={`relative z-10 w-full max-w-sm rounded-2xl p-5 border shadow-2xl transition-all animate-in zoom-in-95 ${
              isDayMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm">Delete Chat?</h4>
            <p className="text-xs opacity-75 mt-1.5 leading-relaxed">
              Are you sure you want to delete your chat with <strong>{primaryRecipient?.displayName || channel.name}</strong>?
              <br /><br />
              <span className="text-rose-500 font-medium">
                To chat again, you will need to send a new request from &ldquo;+ Add Member&rdquo;.
              </span>
            </p>

            <div className="flex items-center space-x-2 mt-5">
              <button
                onClick={() => setConfirmDeleteModal(false)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  isDayMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setConfirmDeleteModal(false);
                  if (onDeleteChannel) {
                    await onDeleteChannel(channel.id, primaryRecipient?.uid);
                  }
                }}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Member Confirmation Dialog */}
      {confirmBlockModal && primaryRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setConfirmBlockModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
          />
          <div
            className={`relative z-10 w-full max-w-sm rounded-2xl p-5 border shadow-2xl transition-all animate-in zoom-in-95 ${
              isDayMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3">
              <Ban className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm">Block Member?</h4>
            <p className="text-xs opacity-75 mt-1.5 leading-relaxed">
              Are you sure you want to block <strong>{primaryRecipient.displayName}</strong>?
              <br /><br />
              <span className="text-amber-500 dark:text-amber-400 font-medium">
                Blocked members will be stored in &ldquo;Blocked Members&rdquo; in the menu drawer, where you can unblock them at any time.
              </span>
            </p>

            <div className="flex items-center space-x-2 mt-5">
              <button
                onClick={() => setConfirmBlockModal(false)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  isDayMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setConfirmBlockModal(false);
                  if (onBlockUser) {
                    await onBlockUser({
                      uid: primaryRecipient.uid,
                      displayName: primaryRecipient.displayName,
                      photoURL: primaryRecipient.photoURL,
                      qid: primaryRecipient.qid,
                      email: primaryRecipient.email
                    });
                  }
                }}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors shadow-sm"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
