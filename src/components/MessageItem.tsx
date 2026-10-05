import React, { useState, useRef, useEffect } from 'react';
import type { Message, Channel, UserProfile } from '../types.ts';
import {
  Play,
  Pause,
  Trash2,
  CheckCheck,
  Check,
  Volume2,
  ThumbsUp,
  Heart,
  Star,
  Bookmark,
  FileText,
  Download,
  Film,
  Clock,
  HardDrive,
  Maximize2,
  X,
  AlertCircle,
  Bot,
  Zap,
  MapPin,
  Navigation,
  ExternalLink,
  Phone,
  User,
  Sparkles,
  Radio,
  Square,
  Edit3,
  Copy,
  Ban,
  MoreVertical,
  EyeOff
} from 'lucide-react';
import { soundService } from '../services/soundService.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { cleanAvatarUrl } from '../utils/avatarUtils.ts';
import { localMediaCache } from '../services/localMediaCache.ts';
import { chatService } from '../services/chatService.ts';

interface MessageItemProps {
  message: Message;
  channel?: Channel | null;
  isCurrentUser: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  currentUserId: string;
  allUsers?: UserProfile[];
  onStopLiveLocation?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newText: string) => Promise<void> | void;
}

const QUICK_REACTIONS = [
  { id: 'like', label: 'Like', icon: ThumbsUp, color: 'text-sky-500 hover:text-sky-400' },
  { id: 'heart', label: 'Love', icon: Heart, color: 'text-rose-500 hover:text-rose-400' },
  { id: 'star', label: 'Star', icon: Star, color: 'text-amber-500 hover:text-amber-400' },
  { id: 'bookmark', label: 'Save', icon: Bookmark, color: 'text-indigo-500 hover:text-indigo-400' }
];

const renderReactionIcon = (reactionKey: string) => {
  switch (reactionKey) {
    case 'like':
      return <ThumbsUp className="w-3 h-3 text-sky-500" />;
    case 'heart':
      return <Heart className="w-3 h-3 text-rose-500" />;
    case 'star':
      return <Star className="w-3 h-3 text-amber-500" />;
    case 'bookmark':
      return <Bookmark className="w-3 h-3 text-indigo-500" />;
    default:
      return <ThumbsUp className="w-3 h-3 text-sky-500" />;
  }
};

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  channel,
  isCurrentUser,
  onReact,
  onDelete,
  currentUserId,
  allUsers = [],
  onStopLiveLocation,
  onDeleteForEveryone,
  onDeleteForMe,
  onEditMessage
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(message.mediaUrl || null);
  const [isSavedInDevice, setIsSavedInDevice] = useState(false);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const audioIntervalRef = useRef<any>(null);
  const longPressTimerRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const { isDayMode, accentConfig } = useTheme();

  // 30-Minute Edit limit calculation
  const createdAtMs = new Date(message.createdAt).getTime();
  const diffMinutes = (Date.now() - createdAtMs) / (60 * 1000);
  const canEdit = isCurrentUser && !message.isDeletedForEveryone && (message.mediaType === 'text' || !message.mediaType) && diffMinutes <= 30;
  const minsLeftToEdit = Math.max(0, Math.ceil(30 - diffMinutes));

  // Sync editText with message.text
  useEffect(() => {
    setEditText(message.text || '');
  }, [message.text]);

  // Mark one-time message as viewed silently without altering receiver UI
  useEffect(() => {
    if (!isCurrentUser && message.isOneTime && (!message.viewedBy || !message.viewedBy.includes(currentUserId))) {
      chatService.markOneTimeViewed(message.channelId, message.id, currentUserId);
    }
  }, [isCurrentUser, message.isOneTime, message.viewedBy, message.channelId, message.id, currentUserId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (message.isDeletedForEveryone) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    longPressTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) {
        try { navigator.vibrate(40); } catch (_) {}
      }
      soundService.playReactionSound();
      setIsActionMenuOpen(true);
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (message.isDeletedForEveryone) return;
    e.preventDefault();
    setIsActionMenuOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    if (!onEditMessage) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await onEditMessage(message.id, editText.trim());
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to edit message');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Load photo from local device memory or cache it locally
  useEffect(() => {
    if (message.mediaType !== 'image') return;

    let isMounted = true;
    localMediaCache.getFromDeviceMemory(message.id).then((cached) => {
      if (!isMounted) return;
      if (cached) {
        setLocalPhotoUrl(cached);
        setIsSavedInDevice(true);
      } else if (message.mediaUrl) {
        // Cache to device memory
        localMediaCache.saveToDeviceMemory(message.id, message.mediaUrl, message.fileName);
        setLocalPhotoUrl(message.mediaUrl);
        setIsSavedInDevice(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [message.id, message.mediaType, message.mediaUrl, message.fileName]);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  const handleAudioToggle = () => {
    if (isPlayingAudio) {
      clearInterval(audioIntervalRef.current);
      setIsPlayingAudio(false);
      setAudioProgress(0);
    } else {
      setIsPlayingAudio(true);
      setAudioProgress(0);
      soundService.playReactionSound();
      const totalDuration = message.mediaDuration || 4; // simulated seconds
      const step = 100 / (totalDuration * 10);

      audioIntervalRef.current = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 100) {
            clearInterval(audioIntervalRef.current);
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + step;
        });
      }, 100);
    }
  };

  const handleReactionClick = (key: string) => {
    soundService.playReactionSound();
    onReact(message.id, key);
  };

  // Determine if message has been read by recipient(s)
  const readByList = message.readBy || [];
  const realParticipants = (channel?.participantIds || []).filter(
    (id) => id && id !== 'system' && id !== message.senderId
  );

  // Read condition: message status is 'read' OR someone other than sender has read it
  const isReadByRecipient =
    message.status === 'read' ||
    readByList.some((uid) => uid !== message.senderId);

  let isReadByAll = false;
  if (realParticipants.length > 0) {
    isReadByAll = realParticipants.every((pId) => readByList.includes(pId));
  } else {
    isReadByAll = isReadByRecipient;
  }

  // Format who has viewed for the tooltip
  const otherViewers = readByList
    .filter((uid) => uid !== message.senderId)
    .map((uid) => {
      if (uid === currentUserId) return 'You';
      const found = allUsers.find((u) => u.uid === uid);
      return found ? found.displayName : null;
    })
    .filter(Boolean);

  let receiptTooltip = 'Sent • Delivered to server';
  if (isReadByAll && realParticipants.length > 1) {
    receiptTooltip = `Read by all participants (${otherViewers.join(', ')})`;
  } else if (isReadByRecipient) {
    receiptTooltip = otherViewers.length > 0
      ? `Read by ${otherViewers.join(', ')}`
      : 'Read by recipient';
  }

  return (
    <div
      className={`group relative flex items-end space-x-2 my-1 px-2.5 sm:px-3 transition-all ${
        isCurrentUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Other user avatar */}
      {!isCurrentUser && (
        <img
          src={cleanAvatarUrl(message.senderPhoto, message.senderName)}
          alt={message.senderName}
          className="w-7 h-7 rounded-full object-cover mb-1 shrink-0 border border-slate-400/40"
        />
      )}

      <div className={`relative max-w-[85%] sm:max-w-[70%] flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        {/* Sender Name in group or API Token name badge */}
        {(!isCurrentUser || message.isApiMessage || message.tokenName) && (
          <div className="flex items-center space-x-1.5 ml-1 mb-0.5 flex-wrap">
            {!isCurrentUser && (
              <span
                className={`text-[11px] font-semibold ${
                  isDayMode ? 'text-emerald-700' : 'text-indigo-300'
                }`}
              >
                {message.senderName}
              </span>
            )}
            {(message.tokenName || message.isApiMessage) && (
              <span
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                title={`Message received via API Token: ${message.tokenName || 'External API'}`}
              >
                <Bot className="w-2.5 h-2.5 text-indigo-400" />
                <span>Token: {message.tokenName || 'API'}</span>
              </span>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onContextMenu={handleContextMenu}
          className={`relative px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl shadow-xs text-sm break-words transition-all cursor-pointer select-text ${
            isCurrentUser
              ? message.isOneTime && message.vanishedFromReceiver
                ? isDayMode
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-dashed border-amber-400 text-amber-950 rounded-br-xs shadow-xs'
                  : 'bg-gradient-to-r from-amber-950/70 to-slate-900 border-2 border-dashed border-amber-500/60 text-amber-200 rounded-br-xs shadow-xs'
                : `${accentConfig.bubbleGradient} text-white rounded-br-xs`
              : isDayMode
              ? 'bg-white border border-emerald-200/90 text-slate-900 rounded-bl-xs shadow-xs'
              : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-xs'
          }`}
        >
          {/* Sender Vanished Alert Header */}
          {isCurrentUser && message.isOneTime && message.vanishedFromReceiver && (
            <div className="flex items-center space-x-1.5 text-[10.5px] font-bold text-amber-600 dark:text-amber-400 mb-1.5 pb-1 border-b border-amber-500/30">
              <EyeOff className="w-3.5 h-3.5 shrink-0" />
              <span>Vanished (Viewed by recipient • Removed from recipient screen)</span>
            </div>
          )}

          {message.isDeletedForEveryone ? (
            <div className="flex items-center space-x-1.5 italic text-xs py-1 opacity-70">
              <Ban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>This message was deleted</span>
            </div>
          ) : (
            <>
          {/* Media: Image (with 24h server expiry & client device memory retention) */}
          {message.mediaType === 'image' && (
            <div className="mb-1.5 w-[220px] sm:w-[240px] max-w-full">
              {localPhotoUrl ? (
                <div className="rounded-xl overflow-hidden border border-black/10 relative group">
                  <img
                    src={localPhotoUrl}
                    alt={message.fileName || 'Photo'}
                    className="w-full max-h-[190px] sm:max-h-[220px] object-cover cursor-pointer hover:scale-[1.01] transition-transform"
                    onClick={() => setIsPhotoViewerOpen(true)}
                  />

                  {/* Quick Save / View overlay button */}
                  <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        localMediaCache.downloadImage(localPhotoUrl, message.fileName);
                      }}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white cursor-pointer shadow-md"
                      title="Save to device"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPhotoViewerOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white cursor-pointer shadow-md"
                      title="View full photo"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 24-Hour Expiry & Device Memory Badge */}
                  <div className="p-1.5 text-[10px] bg-black/65 backdrop-blur-xs text-white flex items-center justify-between">
                    {(() => {
                      const expiryInfo = localMediaCache.formatRemainingExpiry(message.expiresAt);
                      const isVanished = message.serverVanished || expiryInfo.isExpired;
                      return (
                        <>
                          <span
                            className="flex items-center space-x-1 font-medium truncate"
                            title="Permanently saved on this device"
                          >
                            <HardDrive className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Device Saved</span>
                          </span>
                          <span className="flex items-center space-x-1 opacity-90 shrink-0 text-[9px]">
                            <Clock className="w-2.5 h-2.5 text-amber-300" />
                            <span>{isVanished ? 'Vanished from server (24h)' : `${expiryInfo.hoursLeft}h left on server`}</span>
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                /* Photo expired from server and not cached on this device */
                <div
                  className={`p-3 rounded-xl border flex items-center space-x-2.5 ${
                    isCurrentUser
                      ? 'bg-white/10 border-white/20 text-white'
                      : isDayMode ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="text-[11px] leading-tight">
                    <p className="font-semibold">Photo expired from server (24h)</p>
                    <p className="opacity-70 text-[10px] mt-0.5">
                      This photo expired from server after 24 hours. Only users who previously opened it have it saved in local storage.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media: Video */}
          {message.mediaType === 'video' && message.mediaUrl && (
            <div className="mb-1.5 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 w-[220px] sm:w-[240px] max-w-full shadow-xs relative group bg-black">
              <video
                src={message.mediaUrl}
                controls
                playsInline
                className="w-full max-h-[190px] sm:max-h-[220px] object-contain rounded-xl bg-black"
              />
              <div className="p-1.5 text-[10px] bg-black/70 backdrop-blur-xs text-white flex items-center justify-between">
                <span className="flex items-center space-x-1 truncate max-w-[150px]">
                  <Film className="w-3 h-3 text-sky-400 shrink-0" />
                  <span className="truncate">{message.fileName || 'Video'}</span>
                </span>
                {message.fileSize && (
                  <span className="opacity-75 text-[9px] shrink-0">
                    {(message.fileSize / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Media: GIF */}
          {message.mediaType === 'gif' && message.mediaUrl && (
            <div className="mb-1.5 w-[210px] sm:w-[230px] max-w-full rounded-xl overflow-hidden border border-black/10 dark:border-white/10 relative group shadow-xs bg-black/5">
              <img
                src={message.mediaUrl}
                alt="GIF"
                className="w-full max-h-[160px] sm:max-h-[180px] object-cover rounded-xl"
              />
              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[9px] font-black uppercase tracking-wider">
                GIF
              </span>
            </div>
          )}

          {/* Media: Sticker */}
          {message.mediaType === 'sticker' && message.mediaUrl && (
            <div className="mb-1 max-w-[150px] p-1 flex items-center justify-center">
              <img
                src={message.mediaUrl}
                alt="Sticker"
                className="w-28 h-28 sm:w-32 sm:h-32 object-contain hover:scale-105 transition-transform drop-shadow-md select-none"
              />
            </div>
          )}

          {/* Media: Document or File */}
          {(message.mediaType === 'document' || message.mediaType === 'file') && (
            <a
              href={message.mediaUrl || '#'}
              download={message.fileName || 'file'}
              target="_blank"
              rel="noreferrer"
              className={`mb-1.5 p-2.5 rounded-xl border flex items-center space-x-2.5 transition-all shadow-xs w-[215px] sm:w-[235px] max-w-full ${
                isCurrentUser
                  ? 'bg-white/15 hover:bg-white/25 border-white/20 text-white'
                  : isDayMode
                  ? 'bg-white hover:bg-slate-50 border-emerald-200 text-slate-800'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-purple-600/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 font-bold text-[10px] uppercase border border-purple-500/20">
                {message.fileName ? message.fileName.split('.').pop()?.slice(0, 4) : 'FILE'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">{message.fileName || 'Document File'}</div>
                <div className="text-[10px] opacity-70 mt-0.5 flex items-center space-x-2">
                  {message.fileSize ? (
                    <span>{message.fileSize / 1024 < 1000 ? `${(message.fileSize / 1024).toFixed(0)} KB` : `${(message.fileSize / (1024 * 1024)).toFixed(1)} MB`}</span>
                  ) : (
                    <span>Tap to download</span>
                  )}
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                <Download className="w-3.5 h-3.5 opacity-80" />
              </div>
            </a>
          )}

          {/* Media: Location Card (Live Location vs Current Location) */}
          {message.mediaType === 'location' && message.locationData && (() => {
            const loc = message.locationData;
            const isLive = !!loc.isLive;
            const isLiveActive = isLive && loc.isSharingActive !== false && (loc.isAllTime || !loc.liveUntil || Date.now() < loc.liveUntil);

            return (
              <div className="mb-1.5 w-[220px] sm:w-[240px] max-w-full rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-xs">
                {/* Map Graphic with live animation */}
                <div className="relative h-20 w-full bg-emerald-950/20 dark:bg-emerald-900/40 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:12px_12px]" />

                  {isLiveActive ? (
                    <div className="relative flex flex-col items-center">
                      <span className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping duration-1000" />
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 relative z-10">
                        <Radio className="w-4 h-4 animate-pulse" />
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900">
                        <MapPin className="w-4 h-4" />
                      </div>
                    </div>
                  )}

                  {/* Top Badge: LIVE vs CURRENT */}
                  <div className="absolute top-1.5 left-2">
                    {isLive ? (
                      isLiveActive ? (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[8.5px] font-black uppercase tracking-wider shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>{loc.isAllTime ? 'Live • All Time' : 'Live Location'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-slate-700/80 text-white text-[8.5px] font-bold uppercase tracking-wider">
                          <span>Live Ended</span>
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[8.5px] font-bold">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>Current Location</span>
                      </span>
                    )}
                  </div>

                  {/* Live coordinates display */}
                  <div className="absolute bottom-1 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[8.5px] font-mono">
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </div>
                </div>

                {/* Info Details */}
                <div className={`p-2.5 space-y-1.5 ${isCurrentUser ? 'bg-white/10' : isDayMode ? 'bg-white' : 'bg-slate-900'}`}>
                  <div className="font-bold text-xs truncate">
                    {loc.label || (isLive ? (loc.isAllTime ? 'Live Location (All Time)' : 'Live Location') : 'Current Location')}
                  </div>

                  {isLive ? (
                    <div className="text-[10px] opacity-80 flex items-center justify-between">
                      <span>{isLiveActive ? (loc.isAllTime ? 'Live (All Time)' : 'Live tracking active') : 'Sharing stopped'}</span>
                      {loc.lastUpdated && (
                        <span className="font-mono text-[9px] opacity-70">
                          {new Date(loc.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  ) : loc.address ? (
                    <div className="text-[10px] opacity-80 truncate">
                      {loc.address}
                    </div>
                  ) : null}

                  {/* Action Buttons: Stop Sharing (for sender if active) and Open Maps */}
                  <div className="space-y-1 pt-0.5">
                    {isCurrentUser && isLiveActive && (
                      <button
                        type="button"
                        onClick={() => onStopLiveLocation && onStopLiveLocation(message.id)}
                        className="w-full py-1 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10.5px] font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                      >
                        <Square className="w-2.5 h-2.5 fill-current" />
                        <span>Stop Sharing</span>
                      </button>
                    )}

                    <a
                      href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10.5px] font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Open in Google Maps</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Media: Contact Card */}
          {message.mediaType === 'contact' && message.contactData && (
            <div className={`mb-1.5 w-[210px] sm:w-[230px] max-w-full p-2.5 rounded-xl border space-y-2 shadow-xs ${
              isCurrentUser
                ? 'bg-white/15 border-white/20 text-white'
                : isDayMode
                ? 'bg-white border-emerald-200 text-slate-800'
                : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}>
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {message.contactData.avatarUrl ? (
                    <img src={message.contactData.avatarUrl} alt={message.contactData.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    message.contactData.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs truncate">{message.contactData.name}</div>
                  <div className="text-[10px] opacity-75 font-mono truncate">
                    {message.contactData.phone || message.contactData.qid || message.contactData.email || 'Contact'}
                  </div>
                </div>
              </div>
              <div className="border-t pt-1.5 dark:border-slate-800/80 flex items-center justify-around gap-1.5 text-[10.5px]">
                {message.contactData.phone && (
                  <a
                    href={`tel:${message.contactData.phone}`}
                    className="flex-1 py-1 px-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 text-center font-semibold flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Phone className="w-3 h-3 text-emerald-500" />
                    <span>Call</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const text = `${message.contactData?.name}: ${message.contactData?.phone || message.contactData?.qid || ''}`;
                    navigator.clipboard.writeText(text);
                  }}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 text-center font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                >
                  <User className="w-3 h-3 text-indigo-400" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          )}

          {/* Media: Audio Voice Note */}
          {message.mediaType === 'audio' && (
            <div className="flex items-center space-x-3 py-1 px-1 min-w-[200px]">
              <button
                type="button"
                onClick={handleAudioToggle}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isCurrentUser
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : isDayMode
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <div className="flex-1">
                {/* Waveform graphic bars */}
                <div className="flex items-center space-x-1 h-6">
                  {[40, 70, 90, 60, 85, 45, 95, 75, 50, 80, 65, 90, 40].map((height, idx) => (
                    <div
                      key={idx}
                      className={`w-1 rounded-full transition-all ${
                        isCurrentUser
                          ? (idx / 13) * 100 <= audioProgress
                            ? 'bg-white'
                            : 'bg-indigo-300/50'
                          : (idx / 13) * 100 <= audioProgress
                          ? isDayMode ? 'bg-emerald-600' : 'bg-indigo-400'
                          : isDayMode ? 'bg-emerald-100' : 'bg-slate-700'
                      }`}
                      style={{ height: `${height}%` }}
                    ></div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] mt-0.5 opacity-80">
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-2.5 h-2.5" />
                    Voice note
                  </span>
                  <span>0:{message.mediaDuration || '04'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Text Message or Inline Edit */}
          {isEditing ? (
            <div className="mt-1 space-y-1.5 min-w-[200px] sm:min-w-[240px]">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                className={`w-full p-2 text-xs rounded-xl border outline-none resize-none transition-colors ${
                  isCurrentUser
                    ? 'bg-white/20 border-white/30 text-white placeholder-white/70 focus:border-white'
                    : isDayMode
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    : 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500'
                }`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditText(message.text || '');
                  }
                }}
              />
              {editError && (
                <p className="text-[10.5px] text-rose-300">{editError}</p>
              )}
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="opacity-75">
                  {minsLeftToEdit}m left to edit
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(message.text || '');
                    }}
                    className="px-2 py-0.5 rounded-lg opacity-80 hover:opacity-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit || !editText.trim()}
                    className="px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          ) : message.text ? (
            <p className="whitespace-pre-wrap leading-relaxed text-[13px] sm:text-sm">{message.text}</p>
          ) : null}
            </>
          )}

          {/* Meta: Timestamp and Read Receipt Ticks */}
          <div
            className={`flex items-center space-x-1 text-[10px] mt-1 select-none ${
              isCurrentUser
                ? 'text-indigo-200 justify-end'
                : isDayMode
                ? 'text-slate-400 justify-start'
                : 'text-slate-400 justify-start'
            }`}
          >
            <span>{formatTime(message.createdAt)}</span>
            {message.isEdited && !message.isDeletedForEveryone && (
              <span
                className="text-[9px] opacity-75 italic ml-0.5"
                title={message.editedAt ? `Edited at ${new Date(message.editedAt).toLocaleTimeString()}` : 'Edited'}
              >
                (edited)
              </span>
            )}
            {isCurrentUser && !message.isDeletedForEveryone && (
              <span
                className="inline-flex items-center ml-0.5 cursor-help"
                title={receiptTooltip}
              >
                {isReadByRecipient ? (
                  /* Double checkmark when recipient is online and message is read */
                  <CheckCheck
                    className="w-3.5 h-3.5 text-sky-300 drop-shadow-xs transition-all animate-in zoom-in-75 duration-200"
                    aria-label="Read"
                  />
                ) : (
                  /* Single checkmark when message is sent to server */
                  <Check
                    className="w-3.5 h-3.5 text-indigo-200/70 transition-all"
                    aria-label="Sent"
                  />
                )}
              </span>
            )}
            {isCurrentUser && message.isOneTime && !message.isDeletedForEveryone && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-[8.5px] font-black tracking-tight border ${
                  message.vanishedFromReceiver
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
                title={message.vanishedFromReceiver ? 'Vanished from recipient chat' : 'One-Time View Message'}
              >
                {message.vanishedFromReceiver ? 'Vanished' : '1x'}
              </span>
            )}
          </div>
        </div>

        {/* Reaction Counters */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 z-10">
            {Object.entries(message.reactions).map(([key, uids]) => {
              if (!uids || uids.length === 0) return null;
              const hasReacted = uids.includes(currentUserId);
              return (
                <button
                  key={key}
                  onClick={() => handleReactionClick(key)}
                  className={`text-xs px-2 py-0.5 rounded-full flex items-center space-x-1.5 border transition-all cursor-pointer ${
                    hasReacted
                      ? isDayMode
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                        : 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                      : isDayMode
                      ? 'bg-white border-emerald-200 text-slate-700 hover:bg-emerald-50 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{renderReactionIcon(key)}</span>
                  <span className="text-[10px] font-semibold">{uids.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Quick Reaction Floating Trigger on Hover / Tap - Icons only, NO EMOJIS */}
        <div
          className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 border shadow-md rounded-full px-2 py-1 z-20 ${
            isDayMode
              ? 'bg-white border-emerald-200 text-slate-800'
              : 'bg-slate-900/95 border-slate-700/80 text-slate-100'
          } ${isCurrentUser ? 'right-full mr-1.5' : 'left-full ml-1.5'}`}
        >
          {QUICK_REACTIONS.map((item) => {
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleReactionClick(item.id)}
                className={`p-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer ${item.color}`}
                title={item.label}
              >
                <IconComp className="w-3.5 h-3.5" />
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setShowDeleteModal(false);
              setIsActionMenuOpen(true);
            }}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-black/5 rounded-md transition-colors cursor-pointer"
            title="More actions"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowDeleteModal(true);
              setIsActionMenuOpen(true);
            }}
            className="p-1 text-slate-400 hover:text-red-500 hover:bg-black/5 rounded-md transition-colors ml-0.5 cursor-pointer"
            title="Delete message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Long-Press / Click Action Sheet & Delete Modal */}
      {isActionMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => {
              setIsActionMenuOpen(false);
              setShowDeleteModal(false);
            }}
          />
          <div
            className={`relative z-10 w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl p-4 border shadow-2xl transition-all animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 ${
              isDayMode ? 'bg-white border-emerald-100 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            {!showDeleteModal ? (
              <div className="space-y-3">
                {/* 1. Emoji Reaction Bar */}
                <div className="flex items-center justify-around py-2 px-1 bg-black/5 dark:bg-white/5 rounded-2xl">
                  {QUICK_REACTIONS.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleReactionClick(item.id);
                          setIsActionMenuOpen(false);
                        }}
                        className={`p-2 rounded-xl hover:scale-125 transition-transform cursor-pointer ${item.color}`}
                        title={item.label}
                      >
                        <IconComp className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>

                {/* Message preview snippet */}
                {message.text && (
                  <div className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-[11.5px] line-clamp-2 opacity-80 italic">
                    "{message.text}"
                  </div>
                )}

                {/* 2. Action Items */}
                <div className="space-y-1 text-xs font-semibold">
                  {/* Copy Text (Disabled for one-time messages) */}
                  {!message.isOneTime && message.text && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(message.text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl flex items-center space-x-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
                    >
                      <Copy className="w-4 h-4 text-sky-500" />
                      <span>{copied ? 'Copied to clipboard!' : 'Copy Text'}</span>
                    </button>
                  )}

                  {/* Edit Message (30 minutes check) */}
                  {isCurrentUser && (message.mediaType === 'text' || !message.mediaType) && (
                    canEdit ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          setIsEditing(true);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left text-emerald-600 dark:text-emerald-400 font-bold"
                      >
                        <div className="flex items-center space-x-2.5">
                          <Edit3 className="w-4 h-4" />
                          <span>Edit Message</span>
                        </div>
                        <span className="text-[10px] font-normal opacity-80 px-2 py-0.5 rounded-full bg-emerald-500/10">
                          {minsLeftToEdit}m left
                        </span>
                      </button>
                    ) : (
                      <div className="w-full py-2 px-3 rounded-xl flex items-center justify-between opacity-50 text-[11px]">
                        <div className="flex items-center space-x-2.5">
                          <Edit3 className="w-4 h-4" />
                          <span>Edit Message</span>
                        </div>
                        <span className="text-[9.5px]">Expired (&gt;30m)</span>
                      </div>
                    )
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full py-2.5 px-3 rounded-xl flex items-center space-x-2.5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Message...</span>
                  </button>
                </div>

                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => setIsActionMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
              </div>
            ) : (
              /* Delete Options Submenu: Delete for Everyone vs Delete for Me */
              <div className="space-y-3">
                <div className="text-center pb-2 border-b border-black/5 dark:border-white/10">
                  <h4 className="font-bold text-sm text-rose-600">Delete Message</h4>
                  <p className="text-[11px] opacity-70 mt-0.5">Choose how you want to delete this message</p>
                </div>

                <div className="space-y-2">
                  {/* Delete for Everyone (only available for sender's own message) */}
                  {isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionMenuOpen(false);
                        setShowDeleteModal(false);
                        if (onDeleteForEveryone) {
                          onDeleteForEveryone(message.id);
                        } else {
                          onDelete(message.id);
                        }
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete for Everyone</span>
                    </button>
                  )}

                  {/* Delete for Me (always available) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      setShowDeleteModal(false);
                      if (onDeleteForMe) {
                        onDeleteForMe(message.id);
                      } else {
                        onDelete(message.id);
                      }
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all cursor-pointer ${
                      isDayMode
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 opacity-70" />
                    <span>Delete for Me</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="w-full py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-semibold opacity-80 cursor-pointer text-center"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-Screen Photo Viewer Modal */}
      {isPhotoViewerOpen && localPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-2xl w-full max-h-[92vh] flex flex-col items-center">
            {/* Top Bar with actions */}
            <div className="w-full flex items-center justify-between text-white pb-3 px-2">
              <div className="flex items-center space-x-2 text-xs font-semibold">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Saved to Device Memory</span>
                {message.expiresAt && (
                  <span className="text-[10px] opacity-75 ml-2">
                    ({localMediaCache.formatRemainingExpiry(message.expiresAt).isExpired ? 'Vanished from server' : '24h on server'})
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => localMediaCache.downloadImage(localPhotoUrl, message.fileName)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title="Download to device"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPhotoViewerOpen(false)}
                  className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Viewer Container */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl max-h-[78vh] flex items-center justify-center bg-black/60 border border-white/10 w-full">
              <img
                src={localPhotoUrl}
                alt="Full photo"
                className="max-h-[78vh] max-w-full object-contain select-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
