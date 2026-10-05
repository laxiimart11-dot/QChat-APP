import React, { useState } from 'react';
import type { UserProfile, MemberRequest } from '../types.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { chatService } from '../services/chatService.ts';
import { cleanAvatarUrl } from '../utils/avatarUtils.ts';
import {
  X,
  UserPlus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Check,
  Trash2,
  Send,
  Loader2,
  Sparkles,
  Lock,
  Globe
} from 'lucide-react';
import type { DamiAccount } from '../types.ts';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  incomingRequests?: MemberRequest[];
  sentRequests?: MemberRequest[];
  onAcceptRequest?: (request: MemberRequest) => void;
  onDeclineRequest?: (requestId: string) => void;
  onSuccessOpenChat?: (channelId: string) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  incomingRequests = [],
  sentRequests = [],
  onAcceptRequest,
  onDeclineRequest,
  onSuccessOpenChat
}) => {
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'add' | 'sent' | 'received'>('add');
  const { isDayMode } = useTheme();

  if (!isOpen) return null;

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = targetId.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a User ID');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. First check if it matches a Dami account
      const matchedDamis = await chatService.searchDamiAccounts(trimmed, currentUser.uid);
      const cleanTarget = trimmed.toLowerCase().replace(/^@+/, '');
      const exactDami = matchedDamis.find(
        (d) => (d.nameLower || d.name.toLowerCase()) === cleanTarget
      );

      if (exactDami) {
        if (exactDami.creatorId === currentUser.uid || exactDami.memberIds?.includes(currentUser.uid)) {
          setSuccessMsg(`Dami Account "${exactDami.name}" found! Opening chat...`);
          setTargetId('');
          if (exactDami.channelId && onSuccessOpenChat) {
            setTimeout(() => {
              onSuccessOpenChat(exactDami.channelId);
              onClose();
            }, 1000);
          }
          return;
        } else if (exactDami.type === 'public') {
          setSuccessMsg(`Public Dami Account "${exactDami.name}" found! Opening conversation...`);
          setTargetId('');
          if (exactDami.channelId && onSuccessOpenChat) {
            setTimeout(() => {
              onSuccessOpenChat(exactDami.channelId);
              onClose();
            }, 1000);
          }
          return;
        }
      }

      // 2. Otherwise send standard member request / direct add
      const result = await chatService.sendMemberRequest(currentUser, trimmed);
      if (result.success) {
        setSuccessMsg(result.message);
        setTargetId('');
        if (result.channelId && onSuccessOpenChat) {
          setTimeout(() => {
            onSuccessOpenChat(result.channelId!);
            onClose();
          }, 1200);
        }
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSent = async (requestId: string) => {
    try {
      await chatService.cancelMemberRequest(requestId);
    } catch {
      // Ignored
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl transition-colors flex flex-col max-h-[90vh] ${
          isDayMode
            ? 'bg-white border-emerald-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between shrink-0 ${
            isDayMode ? 'bg-[#F1FAF5] border-emerald-100' : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                isDayMode ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
              }`}
            >
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Add Member</h2>
              <p className="text-[11px] opacity-60">Connect &amp; chat with members via User ID</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isDayMode ? 'hover:bg-slate-200/60 text-slate-600' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs if there are sent or incoming requests */}
        <div
          className={`flex border-b text-xs shrink-0 font-medium ${
            isDayMode ? 'border-emerald-100 bg-slate-50' : 'border-slate-800 bg-slate-950/40'
          }`}
        >
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'add'
                ? isDayMode
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            New Request
          </button>

          {incomingRequests.length > 0 && (
            <button
              onClick={() => setActiveTab('received')}
              className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'received'
                  ? isDayMode
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <span>Received</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-600 text-white font-bold">
                {incomingRequests.length}
              </span>
            </button>
          )}

          {sentRequests.length > 0 && (
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'sent'
                  ? isDayMode
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <span>Sent</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-200">
                {sentRequests.length}
              </span>
            </button>
          )}
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'add' && (
            <form onSubmit={handleSendRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 opacity-80">
                  Member User ID
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-mono opacity-50 select-none">@</span>
                  <input
                    type="text"
                    value={targetId}
                    onChange={(e) => {
                      setTargetId(e.target.value);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    placeholder="Enter User ID (e.g. alex01)"
                    autoFocus
                    className={`w-full rounded-2xl pl-8 pr-4 py-2.5 text-xs font-mono border focus:outline-none focus:border-indigo-500 transition-all ${
                      isDayMode
                        ? 'bg-[#F1FAF5] border-emerald-200 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'
                    }`}
                  />
                </div>
                <p className="text-[11px] opacity-60 mt-1.5 leading-relaxed">
                  Enter the member&#39;s User ID. A chat request will be sent to them. Once accepted, you can chat in real-time!
                </p>
              </div>

              {/* Error banner */}
              {errorMsg && (
                <div className="p-3 rounded-2xl text-xs flex items-start space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-500">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Success banner */}
              {successMsg && (
                <div className="p-3 rounded-2xl text-xs flex items-start space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || !targetId.trim()}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Request</span>
                  </>
                )}
              </button>

              {/* Current user ID reminder */}
              <div
                className={`p-3 rounded-2xl border text-center ${
                  isDayMode ? 'bg-[#F1FAF5] border-emerald-100' : 'bg-slate-950/40 border-slate-800/80'
                }`}
              >
                <div className="text-[11px] opacity-70">Your User ID:</div>
                <div className="text-xs font-mono font-bold text-indigo-500 mt-0.5">
                  @{currentUser.qid || 'user'}
                </div>
                <div className="text-[10px] opacity-50 mt-1">
                  Share this ID with friends so they can add you to chat.
                </div>
              </div>
            </form>
          )}

          {activeTab === 'received' && (
            <div className="space-y-2.5">
              {incomingRequests.length === 0 ? (
                <div className="text-center py-8 opacity-60 text-xs">
                  No incoming requests at this moment.
                </div>
              ) : (
                incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      isDayMode ? 'bg-[#F1FAF5] border-emerald-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={cleanAvatarUrl(req.senderPhoto, req.senderName)}
                        alt={req.senderName}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">{req.senderName}</div>
                        <div className="text-[11px] font-mono text-indigo-400">
                          @{req.senderQid || 'user'}
                        </div>
                        <div className="text-[10px] opacity-50">Wants to chat with you</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => {
                          if (onAcceptRequest) onAcceptRequest(req);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-all shadow-xs"
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

          {activeTab === 'sent' && (
            <div className="space-y-2.5">
              {sentRequests.length === 0 ? (
                <div className="text-center py-8 opacity-60 text-xs">
                  No pending sent requests.
                </div>
              ) : (
                sentRequests.map((req) => (
                  <div
                    key={req.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      isDayMode ? 'bg-[#F1FAF5] border-emerald-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={cleanAvatarUrl(req.receiverPhoto, req.receiverName)}
                        alt={req.receiverName || 'Member'}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">
                          {req.receiverName || 'Member'}
                        </div>
                        <div className="text-[11px] font-mono text-indigo-400">
                          @{req.receiverQid || 'user'}
                        </div>
                        <div className="text-[10px] text-amber-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>Pending Approval</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancelSent(req.id)}
                      className="px-2.5 py-1 text-slate-400 hover:text-rose-500 text-[11px] rounded-lg border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
