import React, { useState, useRef } from 'react';
import type { UserProfile } from '../types.ts';
import { User, X, Camera, Trash2, Check, Copy } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import { cleanAvatarUrl, compressImageFile } from '../utils/avatarUtils.ts';

interface UserProfileModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: UserProfile) => void;
}

const QUICK_STATUSES = [
  'Available to chat',
  'Busy at work',
  'In a meeting',
  'Focus mode',
  'Active on QChat'
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSave
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [statusText, setStatusText] = useState(currentUser.statusText || 'Available to chat');
  const [photoURL, setPhotoURL] = useState(
    cleanAvatarUrl(currentUser.photoURL, currentUser.displayName)
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedQid, setCopiedQid] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDayMode } = useTheme();

  if (!isOpen) return null;

  // Handle custom personal image upload from device
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const compressedDataUrl = await compressImageFile(file, 320, 0.85);
      setPhotoURL(compressedDataUrl);
    } catch (err: any) {
      console.error('Image upload/compression failed:', err);
      setUploadError('Failed to process image. Please try another image.');
    } finally {
      setUploading(false);
      // Reset input value so same file can be selected again if desired
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResetToDefault = () => {
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName.trim() || 'User'
    )}&background=6366f1&color=fff&size=200&bold=true`;
    setPhotoURL(defaultAvatar);
  };

  const handleCopyQid = () => {
    if (!currentUser.qid) return;
    navigator.clipboard.writeText(`@${currentUser.qid}`).then(() => {
      setCopiedQid(true);
      setTimeout(() => setCopiedQid(false), 2000);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...currentUser,
      displayName: displayName.trim() || 'User',
      statusText: statusText.trim(),
      photoURL
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-sm rounded-2xl border shadow-xl overflow-hidden transition-colors ${
          isDayMode
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header - Simple Plain UI */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isDayMode ? 'border-slate-100' : 'border-slate-800'
          }`}
        >
          <span className="font-bold text-sm tracking-wide">Edit Profile</span>
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

        {/* Form Body - Simple Plain UI */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Profile Picture Upload Section */}
          <div className="flex flex-col items-center justify-center py-2 space-y-3">
            <div className="relative group">
              <img
                src={photoURL}
                alt="Profile Preview"
                className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500/40 shadow-sm"
              />

              {/* Upload trigger button on avatar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] cursor-pointer"
                title="Change Photo"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                <span>Upload</span>
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Upload Buttons */}
            <div className="flex items-center space-x-2 text-xs">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{uploading ? 'Processing...' : 'Upload Photo'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetToDefault}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDayMode
                    ? 'border-slate-200 hover:bg-slate-100 text-slate-500'
                    : 'border-slate-700 hover:bg-slate-800 text-slate-400'
                }`}
                title="Use initials avatar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {uploadError && (
              <p className="text-[11px] text-rose-500 text-center font-medium">{uploadError}</p>
            )}
          </div>

          {/* User Account Info Badges - Plain text */}
          <div className="space-y-1.5 text-xs">
            {currentUser.qid && (
              <div
                className={`py-2 px-3 rounded-lg flex items-center justify-between ${
                  isDayMode ? 'bg-slate-50 border border-slate-100' : 'bg-slate-800/60 border border-slate-800'
                }`}
              >
                <span className="text-[11px] opacity-60">QID</span>
                <div className="flex items-center space-x-1.5 font-mono text-indigo-500 font-semibold">
                  <span>@{currentUser.qid}</span>
                  <button
                    type="button"
                    onClick={handleCopyQid}
                    className="text-slate-400 hover:text-indigo-500 cursor-pointer"
                    title="Copy QID"
                  >
                    {copiedQid ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {(currentUser.email || currentUser.phoneNumber) && (
              <div
                className={`py-2 px-3 rounded-lg flex items-center justify-between ${
                  isDayMode ? 'bg-slate-50 border border-slate-100' : 'bg-slate-800/60 border border-slate-800'
                }`}
              >
                <span className="text-[11px] opacity-60">
                  {currentUser.phoneNumber ? 'Phone' : 'Email'}
                </span>
                <span className="font-mono opacity-80 truncate max-w-[180px]">
                  {currentUser.phoneNumber || currentUser.email}
                </span>
              </div>
            )}
          </div>

          {/* Display Name Input */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider opacity-60">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              maxLength={40}
              className={`w-full rounded-lg px-3 py-2 text-xs border focus:outline-none focus:border-indigo-500 transition-colors ${
                isDayMode
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-slate-800/70 border-slate-700 text-slate-100'
              }`}
              required
            />
          </div>

          {/* Status Bio Input */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider opacity-60">
              Status Message
            </label>
            <input
              type="text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="e.g. Available to chat"
              maxLength={80}
              className={`w-full rounded-lg px-3 py-2 text-xs border focus:outline-none focus:border-indigo-500 transition-colors ${
                isDayMode
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-slate-800/70 border-slate-700 text-slate-100'
              }`}
            />
            {/* Quick status plain tags */}
            <div className="flex flex-wrap gap-1 pt-1">
              {QUICK_STATUSES.map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => setStatusText(status)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    statusText === status
                      ? 'border-indigo-500 text-indigo-500 font-semibold'
                      : isDayMode
                      ? 'border-slate-200 text-slate-500 hover:border-slate-300'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div
            className={`pt-3 border-t flex items-center justify-end space-x-2 ${
              isDayMode ? 'border-slate-100' : 'border-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                isDayMode ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
