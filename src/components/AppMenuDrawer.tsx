import React, { useState } from 'react';
import type { Channel, UserProfile, BlockedUserRecord } from '../types.ts';
import {
  X,
  User,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  LogOut,
  Copy,
  Check,
  Monitor,
  Ban,
  Users,
  Smartphone
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import { ColorThemePicker } from './ColorThemePicker.tsx';
import { soundService } from '../services/soundService.ts';
import { signOut, auth } from '../firebase.ts';
import { cleanAvatarUrl } from '../utils/avatarUtils.ts';

interface AppMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onlineUsers?: UserProfile[];
  channels?: Channel[];
  blockedUsers?: BlockedUserRecord[];
  onOpenBlockedModal?: () => void;
  onOpenDamiManager?: () => void;
  damiAccountsCount?: number;
  onOpenProfile: () => void;
  onOpenAddMember?: () => void;
  onOpenNewChannel?: () => void;
  onOpenAuth: () => void;
  onStartDirectChat?: (contact: UserProfile) => void;
  onSelectChannel?: (channelId: string) => void;
  activeTab?: string;
  onSetTab?: (tab: any) => void;
  onSetDeviceMode?: (mode: 'responsive' | 'ios' | 'android') => void;
  currentDeviceMode?: 'responsive' | 'ios' | 'android';
}

export const AppMenuDrawer: React.FC<AppMenuDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  blockedUsers = [],
  onOpenBlockedModal,
  onOpenDamiManager,
  damiAccountsCount = 0,
  onOpenProfile,
  onOpenAuth,
  onSetDeviceMode,
  currentDeviceMode = 'responsive'
}) => {
  const { isDayMode, toggleTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = useState(soundService.isSoundEnabled());
  const [copiedQid, setCopiedQid] = useState(false);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const newState = soundService.toggleSound();
    setSoundEnabled(newState);
    if (newState) {
      soundService.playReceivedSound();
    }
  };

  const handleCopyQid = () => {
    if (!currentUser.qid) return;
    navigator.clipboard.writeText(`@${currentUser.qid}`).then(() => {
      setCopiedQid(true);
      setTimeout(() => setCopiedQid(false), 2000);
    });
  };

  const handleSignOut = async () => {
    try {
      if (currentUser?.uid) {
        localStorage.removeItem(`qchat_verified_${currentUser.uid}`);
      }
      localStorage.removeItem('qchat_verified_session');
      await signOut(auth);
      onClose();
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const userAvatar = cleanAvatarUrl(currentUser.photoURL, currentUser.displayName);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-out Drawer */}
      <div
        className={`relative z-10 w-full max-w-xs sm:max-w-sm h-full flex flex-col shadow-2xl transition-all duration-300 animate-in slide-in-from-left ${
          isDayMode
            ? 'bg-white text-slate-800 border-r border-slate-200'
            : 'bg-slate-900 text-slate-100 border-r border-slate-800'
        }`}
      >
        {/* Minimal Plain Header with Close button */}
        <div
          className={`p-4 flex items-center justify-between border-b ${
            isDayMode ? 'border-slate-100' : 'border-slate-800'
          }`}
        >
          <span className="font-bold text-sm tracking-wide">Settings &amp; Options</span>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDayMode ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plain Text Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">
          {/* User Profile Section - Plain text display, clean human avatar */}
          <div className="space-y-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <img
                src={userAvatar}
                alt={currentUser.displayName}
                className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate">{currentUser.displayName}</div>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="text-xs text-indigo-500 font-mono">
                    @{currentUser.qid || 'user'}
                  </span>
                  <button
                    onClick={handleCopyQid}
                    className="text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                    title="Copy QID"
                  >
                    {copiedQid ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="text-xs opacity-60 truncate mt-0.5">
                  {currentUser.email || currentUser.phoneNumber || 'Active Account'}
                </div>
              </div>
            </div>

            {/* Profile Action Plain Links */}
            <div className="flex items-center space-x-4 pt-1 text-xs font-semibold">
              <button
                onClick={() => {
                  onClose();
                  onOpenProfile();
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center space-x-1"
              >
                <User className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="opacity-75 hover:opacity-100 hover:underline cursor-pointer"
              >
                Switch Account
              </button>
            </div>
          </div>

          {/* Preferences Section - Plain Text */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-50 px-1 py-1">
              Preferences
            </div>

            {/* Your Dami Manager */}
            <button
              onClick={() => {
                onClose();
                onOpenDamiManager?.();
              }}
              className={`w-full py-2.5 px-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                isDayMode ? 'hover:bg-slate-100' : 'hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4 opacity-70 shrink-0 text-slate-500" />
                <span className="text-xs font-medium">Dami Account Manager</span>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {damiAccountsCount > 0 ? `${damiAccountsCount}` : 'Manage'}
              </span>
            </button>

            {/* Blocked Users - Simple, Clean Row */}
            <button
              onClick={() => {
                onClose();
                onOpenBlockedModal?.();
              }}
              className={`w-full py-2.5 px-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                isDayMode ? 'hover:bg-slate-100' : 'hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Ban className="w-4 h-4 opacity-70 shrink-0 text-rose-500" />
                <span className="text-xs font-medium">Blocked Members</span>
              </div>
              <span className={`text-xs font-semibold ${
                blockedUsers.length > 0 ? 'text-rose-500' : 'opacity-70'
              }`}>
                {blockedUsers.length > 0 ? `${blockedUsers.length}` : '0'}
              </span>
            </button>

            {/* Color & Theme Settings */}
            <div className="pt-1">
              <ColorThemePicker compact={false} />
            </div>

            {/* Sound Alerts - Plain text */}
            <button
              onClick={handleToggleSound}
              className={`w-full py-2.5 px-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                isDayMode ? 'hover:bg-slate-100' : 'hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 opacity-70 shrink-0" />
                ) : (
                  <VolumeX className="w-4 h-4 opacity-70 shrink-0" />
                )}
                <span className="text-xs font-medium">Sound Notifications</span>
              </div>
              <span className="text-xs font-semibold opacity-70">
                {soundEnabled ? 'On' : 'Off'}
              </span>
            </button>

            {/* Display Layout Mode - Plain text */}
            {onSetDeviceMode && (
              <div
                className={`w-full py-2.5 px-2 rounded-lg flex items-center justify-between text-left ${
                  isDayMode ? 'hover:bg-slate-100' : 'hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Monitor className="w-4 h-4 opacity-70 shrink-0" />
                  <span className="text-xs font-medium">Display Layout</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <button
                    onClick={() => onSetDeviceMode('responsive')}
                    className={`cursor-pointer ${
                      currentDeviceMode === 'responsive'
                        ? 'font-bold text-indigo-500 underline'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    Web
                  </button>
                  <span className="opacity-30">|</span>
                  <button
                    onClick={() => onSetDeviceMode('ios')}
                    className={`cursor-pointer ${
                      currentDeviceMode === 'ios'
                        ? 'font-bold text-indigo-500 underline'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    iOS
                  </button>
                  <span className="opacity-30">|</span>
                  <button
                    onClick={() => onSetDeviceMode('android')}
                    className={`cursor-pointer ${
                      currentDeviceMode === 'android'
                        ? 'font-bold text-indigo-500 underline'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    Android
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Account / Sign Out - Plain Text */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleSignOut}
              className="w-full py-2.5 px-2 rounded-lg flex items-center space-x-3 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-xs font-semibold"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
