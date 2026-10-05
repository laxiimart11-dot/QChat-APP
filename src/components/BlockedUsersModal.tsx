import React, { useState } from 'react';
import type { BlockedUserRecord } from '../types.ts';
import { Ban, X, ShieldCheck, Check, Search } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import { cleanAvatarUrl } from '../utils/avatarUtils.ts';

interface BlockedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockedUsers: BlockedUserRecord[];
  onUnblock: (targetUid: string) => Promise<void> | void;
}

export const BlockedUsersModal: React.FC<BlockedUsersModalProps> = ({
  isOpen,
  onClose,
  blockedUsers,
  onUnblock
}) => {
  const { isDayMode } = useTheme();
  const [unblockingUid, setUnblockingUid] = useState<string | null>(null);
  const [unblockedSuccessUid, setUnblockedSuccessUid] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  const handleUnblockClick = async (uid: string) => {
    setUnblockingUid(uid);
    try {
      await onUnblock(uid);
      setUnblockedSuccessUid(uid);
      setTimeout(() => {
        setUnblockedSuccessUid(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to unblock:', err);
    } finally {
      setUnblockingUid(null);
    }
  };

  const filteredUsers = blockedUsers.filter((u) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(term) ||
      (u.qid && u.qid.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term))
    );
  });

  const formatBlockedDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Dialog */}
      <div
        className={`relative z-10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[85vh] transition-all animate-in zoom-in-95 ${
          isDayMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`p-3.5 border-b flex items-center justify-between shrink-0 ${
            isDayMode ? 'border-slate-100 bg-white' : 'border-slate-800 bg-slate-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Ban className="w-4 h-4 text-rose-500" />
            <h3 className="font-bold text-sm">Blocked Members</h3>
            {blockedUsers.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {blockedUsers.length}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDayMode ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search input if more than 3 blocked users */}
        {blockedUsers.length > 3 && (
          <div className="p-3 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 opacity-50" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search blocked members..."
                className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-hidden transition-all ${
                  isDayMode
                    ? 'bg-slate-50 border-slate-200 focus:border-rose-400'
                    : 'bg-slate-950 border-slate-800 focus:border-rose-500'
                }`}
              />
            </div>
          </div>
        )}

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {blockedUsers.length === 0 ? (
            <div className="text-center py-12 px-4 opacity-70">
              <div
                className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3 ${
                  isDayMode ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-800 text-emerald-400'
                }`}
              >
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm">No blocked members</p>
              <p className="text-xs opacity-70 mt-1 max-w-[260px] mx-auto leading-relaxed">
                You have not blocked any members. Blocked members will appear here.
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 opacity-70 text-xs">
              <p>&ldquo;{searchFilter}&rdquo; did not match any blocked members</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const avatar = cleanAvatarUrl(user.photoURL, user.displayName);
              const isUnblocking = unblockingUid === user.uid;
              const isSuccess = unblockedSuccessUid === user.uid;

              return (
                <div
                  key={user.uid}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isDayMode
                      ? 'bg-white border-slate-100 shadow-2xs hover:border-slate-200'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
                    <img
                      src={avatar}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-300 dark:border-slate-700"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                        <span className="truncate">{user.displayName}</span>
                        <span className="px-1.5 py-0.2 rounded-md text-[9px] bg-rose-500/10 text-rose-500 font-bold shrink-0">
                          Blocked
                        </span>
                      </div>
                      <div className="text-[11px] text-indigo-500 font-mono truncate mt-0.5">
                        @{user.qid || 'user'}
                      </div>
                      {user.blockedAt && (
                        <div className="text-[10px] opacity-50 truncate mt-0.5">
                          Blocked on: {formatBlockedDate(user.blockedAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Unblock Action Button */}
                  <button
                    onClick={() => handleUnblockClick(user.uid)}
                    disabled={isUnblocking || isSuccess}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center space-x-1.5 ${
                      isSuccess
                        ? 'bg-emerald-600 text-white'
                        : isDayMode
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                    title="Unblock Member"
                  >
                    {isSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Unblocked</span>
                      </>
                    ) : isUnblocking ? (
                      <span>Unblocking...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Unblock</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-3 border-t flex items-center justify-between text-xs shrink-0 ${
            isDayMode ? 'border-slate-100 bg-slate-50/60' : 'border-slate-800 bg-slate-950/40'
          }`}
        >
          <span className="opacity-60 text-[11px]">
            Unblocking allows you to send and receive messages again
          </span>
          <button
            onClick={onClose}
            className={`px-3 py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
              isDayMode ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
