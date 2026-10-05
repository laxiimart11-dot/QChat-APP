import React, { useState } from 'react';
import { User, Phone, X, Check, Users, Search, Plus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import type { UserProfile, ContactData } from '../types.ts';
import { cleanAvatarUrl } from '../utils/avatarUtils.ts';

interface ContactShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableContacts: UserProfile[];
  onSendContact: (data: ContactData) => void;
}

export const ContactShareModal: React.FC<ContactShareModalProps> = ({
  isOpen,
  onClose,
  availableContacts,
  onSendContact
}) => {
  const { isDayMode } = useTheme();
  const [tab, setTab] = useState<'pick' | 'manual'>('pick');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [qid, setQid] = useState('');

  if (!isOpen) return null;

  const filteredContacts = availableContacts.filter((c) =>
    c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.qid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneNumber?.includes(searchQuery)
  );

  const handlePickContact = (contact: UserProfile) => {
    onSendContact({
      name: contact.displayName,
      phone: contact.phoneNumber || '',
      email: contact.email || '',
      qid: contact.qid || '',
      avatarUrl: contact.photoURL || ''
    });
    onClose();
  };

  const handleSendManual = () => {
    if (!name.trim()) return;
    onSendContact({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      qid: qid.trim() || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
      />
      <div
        className={`relative z-10 w-full max-w-sm rounded-3xl p-5 border shadow-2xl transition-all animate-in zoom-in-95 flex flex-col max-h-[85vh] ${
          isDayMode
            ? 'bg-white border-emerald-100 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm">Share Contact</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-2xl my-3 shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('pick')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              tab === 'pick'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'opacity-65 hover:opacity-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>My Friends</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              tab === 'manual'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'opacity-65 hover:opacity-100'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enter Manually</span>
          </button>
        </div>

        {/* TAB 1: PICK EXISTING CONTACT */}
        {tab === 'pick' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <div
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs shrink-0 ${
                isDayMode
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5 opacity-60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contact..."
                className="w-full bg-transparent outline-none text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.uid}
                    onClick={() => handlePickContact(contact)}
                    className="p-2.5 rounded-2xl border border-black/5 dark:border-white/5 hover:border-indigo-500/50 hover:bg-black/5 dark:hover:bg-white/5 flex items-center space-x-3 cursor-pointer transition-all"
                  >
                    <img
                      src={cleanAvatarUrl(contact.photoURL, contact.displayName)}
                      alt={contact.displayName}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs truncate">
                        {contact.displayName}
                      </div>
                      <div className="text-[10px] opacity-60 truncate">
                        {contact.phoneNumber || (contact.qid ? `@${contact.qid}` : 'QChat Member')}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg bg-indigo-500/10">
                      Send
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs opacity-60 space-y-2">
                  <p>No contacts found.</p>
                  <button
                    type="button"
                    onClick={() => setTab('manual')}
                    className="text-indigo-500 font-bold underline"
                  >
                    Enter contact info manually &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL CONTACT ENTRY */}
        {tab === 'manual' && (
          <div className="space-y-3 text-xs overflow-y-auto pr-1">
            <div>
              <label className="font-bold opacity-75 block mb-1">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  isDayMode
                    ? 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                    : 'bg-slate-950 border-slate-800 focus:border-indigo-500'
                }`}
                autoFocus
              />
            </div>

            <div>
              <label className="font-bold opacity-75 block mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +880 1700 000000"
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  isDayMode
                    ? 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                    : 'bg-slate-950 border-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>

            <div>
              <label className="font-bold opacity-75 block mb-1">Email or QID (optional)</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. user@gmail.com or @john"
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  isDayMode
                    ? 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                    : 'bg-slate-950 border-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendManual}
                disabled={!name.trim()}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Send Contact Card</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
