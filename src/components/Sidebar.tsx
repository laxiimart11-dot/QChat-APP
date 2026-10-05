import React, { useState, useEffect } from 'react';
import type { Channel, UserProfile, MemberRequest, BlockedUserRecord } from '../types.ts';
import {
  Search,
  X,
  MessageCircle,
  User,
  Check,
  UserPlus,
  Clock,
  Inbox,
  MoreVertical,
  Trash2,
  Ban,
  AlertCircle,
  Lock,
  Globe,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import { cleanAvatarUrl } from '../utils/avatarUtils.ts';

interface SidebarProps {
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  currentUser: UserProfile;
  onlineUsers?: UserProfile[];
  incomingRequests?: MemberRequest[];
  blockedUsers?: BlockedUserRecord[];
  onOpenAddMember: () => void;
  onAcceptRequest?: (request: MemberRequest) => void;
  onDeclineRequest?: (requestId: string) => void;
  onDeleteChannel?: (channelId: string, otherUserId?: string) => Promise<void> | void;
  onBlockUser?: (targetUser: { uid: string; displayName: string; photoURL?: string; qid?: string; email?: string }) => Promise<void> | void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenMenu: () => void;
  tab?: 'chats' | 'requests';
  onTabChange?: (tab: 'chats' | 'requests') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  channels,
  activeChannelId,
  onSelectChannel,
  currentUser,
  incomingRequests = [],
  blockedUsers = [],
  onOpenAddMember,
  onAcceptRequest,
  onDeclineRequest,
  onDeleteChannel,
  onBlockUser,
  onOpenProfile,
  onOpenMenu,
  tab: externalTab,
  onTabChange
}) => {
  const [internalTab, setInternalTab] = useState<'chats' | 'requests'>('chats');
  const tab = externalTab !== undefined ? externalTab : internalTab;
  const setTab = (newTab: 'chats' | 'requests') => {
    if (onTabChange) onTabChange(newTab);
    setInternalTab(newTab);
  };
  const [searchFilter, setSearchFilter] = useState('');
  const [activeMenuChannelId, setActiveMenuChannelId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ channelId: string; otherUserId?: string; name: string } | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<{ user: { uid: string; displayName: string; photoURL?: string; qid?: string; email?: string } } | null>(null);
  const { isDayMode, accentConfig } = useTheme();

  // Close 3-dots menu on ANY outside touch/click anywhere on screen (capture phase)
  useEffect(() => {
    if (!activeMenuChannelId) return;

    const handleGlobalTouchOrClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest('[data-chat-menu]')) {
        setActiveMenuChannelId(null);
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
  }, [activeMenuChannelId]);

  const blockedUids = blockedUsers.map((b) => b.uid);

  const formatChannelTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const query = searchFilter.trim().toLowerCase();
  const isSearching = query.length > 0;

  // Filter channels in real-time - ONLY search among existing active conversations!
  // Blocked users are moved to the Drawer "Blocked Users" menu as requested.
  const activeChannels = channels.filter((c) => {
    const otherUid = c.participantIds?.find((id) => id !== currentUser.uid);
    if (otherUid && blockedUids.includes(otherUid)) {
      return false; // Stored in the Drawer "Blocked Users" menu!
    }
    return true;
  });

  const filteredChannels = activeChannels.filter((c) => {
    if (!isSearching) return true;
    const matchesName = c.name.toLowerCase().includes(query);
    const matchesMsg = c.lastMessageText && c.lastMessageText.toLowerCase().includes(query);
    const matchesDesc = c.description && c.description.toLowerCase().includes(query);
    return matchesName || matchesMsg || matchesDesc;
  });

  const handleClearSearch = () => {
    setSearchFilter('');
  };

  return (
    <div
      className={`w-full md:w-80 lg:w-96 h-full flex flex-col shrink-0 select-none border-r transition-colors ${
        isDayMode
          ? 'bg-white border-emerald-200/90 text-slate-800'
          : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}
    >
      {/* Search Bar - only searches user's active chats */}
      <div className="p-3 pb-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 opacity-50" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search chats..."
            className={`w-full rounded-2xl pl-9 pr-9 py-2 text-xs border focus:outline-none focus:border-indigo-500 transition-all ${
              isDayMode
                ? 'bg-[#F1FAF5] border-emerald-200 text-slate-900 placeholder-slate-400'
                : 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'
            }`}
          />
          {isSearching && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 p-1 opacity-60 hover:opacity-100 rounded-lg transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs: Chats & Member Requests */}
      <div className="px-3 pb-2 flex items-center space-x-1.5">
        <button
          onClick={() => setTab('chats')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            tab === 'chats'
              ? `${accentConfig.primaryBg} text-white shadow-sm`
              : isDayMode
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Chats</span>
          <span className="opacity-75 text-[10px]">({channels.length})</span>
        </button>

        <button
          onClick={() => setTab('requests')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-1.5 relative ${
            tab === 'requests'
              ? `${accentConfig.primaryBg} text-white shadow-sm`
              : isDayMode
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Requests</span>
          {incomingRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold ml-1 animate-pulse">
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {/* Tab 1: Connected Member Chats */}
        {tab === 'chats' && (
          <div>
            {filteredChannels.length === 0 ? (
              <div className="text-center py-12 px-4 opacity-70 text-xs">
                <div
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto mb-2 ${
                    isDayMode ? 'bg-[#F1FAF5] border-emerald-200' : 'bg-slate-800/80 border-slate-700/60'
                  }`}
                >
                  <MessageCircle className="w-6 h-6 opacity-60" />
                </div>
                {isSearching ? (
                  <div>
                    <p className="font-semibold">&ldquo;{searchFilter}&rdquo; did not match any chats</p>
                    <button
                      onClick={handleClearSearch}
                      className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium cursor-pointer"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-sm">No chats yet</p>
                    <p className="text-[11px] opacity-60 mt-1 max-w-[200px] mx-auto">
                      Click &ldquo;+ Add Member&rdquo; below with a User ID to start chatting.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              filteredChannels.map((c) => {
                const isActive = c.id === activeChannelId;
                // Channel photo or user avatar
                const otherUid = c.participantIds?.find((id) => id !== currentUser.uid);
                const photo =
                  c.participantPhotos?.[otherUid || ''] ||
                  cleanAvatarUrl(null, c.name);
                const isMenuOpen = activeMenuChannelId === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveMenuChannelId(null);
                      onSelectChannel(c.id);
                    }}
                    className={`w-full p-2.5 rounded-2xl flex items-center space-x-3 transition-all text-left cursor-pointer border relative group ${
                      isActive
                        ? isDayMode
                          ? 'bg-[#F1FAF5] border-emerald-300 shadow-xs'
                          : 'bg-indigo-600/20 border-indigo-500/50 text-white'
                        : isDayMode
                        ? 'border-transparent hover:bg-slate-50 text-slate-800'
                        : 'border-transparent hover:bg-slate-800/70 text-slate-300'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {c.isDami ? (
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                            c.damiType === 'private'
                              ? 'bg-violet-600 text-white shadow-xs'
                              : 'bg-emerald-600 text-white shadow-xs'
                          }`}
                        >
                          {c.damiType === 'private' ? (
                            <Lock className="w-5 h-5" />
                          ) : (
                            <Globe className="w-5 h-5" />
                          )}
                        </div>
                      ) : (
                        <>
                          <img
                            src={photo}
                            alt={c.name}
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
                          />
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900"></span>
                        </>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span
                            className={`font-semibold text-xs truncate ${
                              isDayMode ? 'text-slate-900' : 'text-slate-100'
                            }`}
                          >
                            {c.name}
                          </span>
                          {c.isDami && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase shrink-0 ${
                                c.damiType === 'private'
                                  ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              Dami
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] opacity-60 shrink-0 ml-1">
                          {formatChannelTime(c.lastMessageTime)}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-70 truncate">
                        {c.lastMessageText || 'Conversation started'}
                      </p>
                    </div>

                    {/* 3-dots action menu button */}
                    <div className="relative shrink-0" data-chat-menu="true">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuChannelId(isMenuOpen ? null : c.id);
                        }}
                        className={`p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-all cursor-pointer ${
                          isMenuOpen ? 'opacity-100 bg-black/10 dark:bg-white/10' : 'group-hover:opacity-100'
                        }`}
                        title="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <>
                          {/* Invisible backdrop for outside click / touch */}
                          <div
                            className="fixed inset-0 z-30 bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuChannelId(null);
                            }}
                          />
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute right-0 top-8 z-40 w-44 rounded-xl shadow-xl border py-1 animate-in fade-in zoom-in-95 ${
                              isDayMode
                                ? 'bg-white border-slate-200 text-slate-800'
                                : 'bg-slate-900 border-slate-800 text-slate-100'
                            }`}
                          >
                          {/* Block Option */}
                          {otherUid && (
                            <button
                              onClick={() => {
                                setActiveMenuChannelId(null);
                                setConfirmBlock({
                                  user: {
                                    uid: otherUid,
                                    displayName: c.name,
                                    photoURL: photo
                                  }
                                });
                              }}
                              className={`w-full px-3 py-2 text-xs flex items-center space-x-2 text-left transition-colors cursor-pointer ${
                                isDayMode ? 'hover:bg-rose-50 text-rose-600' : 'hover:bg-rose-950/30 text-rose-400'
                              }`}
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Block Member</span>
                            </button>
                          )}

                          {/* Delete Option */}
                          <button
                            onClick={() => {
                              setActiveMenuChannelId(null);
                              setConfirmDelete({
                                channelId: c.id,
                                otherUserId: otherUid,
                                name: c.name
                              });
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
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Incoming Member Requests */}
        {tab === 'requests' && (
          <div className="space-y-2 py-1">
            {incomingRequests.length === 0 ? (
              <div className="text-center py-12 px-4 opacity-70 text-xs">
                <div
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto mb-2 ${
                    isDayMode ? 'bg-[#F1FAF5] border-emerald-200' : 'bg-slate-800/80 border-slate-700/60'
                  }`}
                >
                  <Inbox className="w-6 h-6 opacity-60" />
                </div>
                <p className="font-semibold text-sm">No Member Requests</p>
                <p className="text-[11px] opacity-60 mt-1 max-w-[220px] mx-auto">
                  When someone adds you using your User ID (@{currentUser.qid || 'user'}), their request will appear here.
                </p>
              </div>
            ) : (
              incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                    isDayMode
                      ? 'bg-[#F1FAF5] border-emerald-200/90 shadow-xs'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <img
                      src={cleanAvatarUrl(req.senderPhoto, req.senderName)}
                      alt={req.senderName}
                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-indigo-500/30"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{req.senderName}</div>
                      <div className="text-[10px] font-mono text-indigo-400 truncate">
                        @{req.senderQid || 'user'}
                      </div>
                      <div className="text-[10px] opacity-60 mt-0.5">Wants to connect</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => {
                        if (onAcceptRequest) onAcceptRequest(req);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-all shadow-xs"
                      title="Accept Request"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onDeclineRequest) onDeclineRequest(req.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                      title="Decline"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Action: "Add Member" button */}
      <div
        className={`p-3 border-t shrink-0 transition-colors ${
          isDayMode ? 'bg-white border-emerald-100' : 'bg-slate-900/90 border-slate-800'
        }`}
      >
        <button
          onClick={onOpenAddMember}
          className={`w-full py-2.5 px-4 ${accentConfig.bubbleGradient} text-white font-semibold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer`}
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Member</span>
        </button>
      </div>

      {/* Delete Member & Chat Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setConfirmDelete(null)}
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
              Are you sure you want to delete your chat with <strong>{confirmDelete.name}</strong>?
              <br /><br />
              <span className="text-rose-500 font-medium">
                To chat again, you will need to send a new request from &ldquo;+ Add Member&rdquo;.
              </span>
            </p>

            <div className="flex items-center space-x-2 mt-5">
              <button
                onClick={() => setConfirmDelete(null)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  isDayMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const target = confirmDelete;
                  setConfirmDelete(null);
                  if (onDeleteChannel) {
                    await onDeleteChannel(target.channelId, target.otherUserId);
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
      {confirmBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setConfirmBlock(null)}
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
              Are you sure you want to block <strong>{confirmBlock.user.displayName}</strong>?
              <br /><br />
              <span className="text-amber-500 dark:text-amber-400 font-medium">
                Blocked members can be unblocked anytime from the &ldquo;Blocked Members&rdquo; list in the menu.
              </span>
            </p>

            <div className="flex items-center space-x-2 mt-5">
              <button
                onClick={() => setConfirmBlock(null)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  isDayMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const targetUser = confirmBlock.user;
                  setConfirmBlock(null);
                  if (onBlockUser) {
                    await onBlockUser(targetUser);
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
