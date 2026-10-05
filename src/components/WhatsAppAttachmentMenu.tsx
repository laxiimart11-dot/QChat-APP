import React, { useRef, useEffect } from 'react';
import {
  FileText,
  Camera,
  Image as ImageIcon,
  Film,
  Headphones,
  MapPin,
  User,
  Sparkles,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';

interface WhatsAppAttachmentMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument: () => void;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
  onSelectVideo: () => void;
  onSelectAudio: () => void;
  onSelectLocation: () => void;
  onSelectContact: () => void;
  onSelectSticker: () => void;
}

export const WhatsAppAttachmentMenu: React.FC<WhatsAppAttachmentMenuProps> = ({
  isOpen,
  onClose,
  onSelectDocument,
  onSelectCamera,
  onSelectGallery,
  onSelectVideo,
  onSelectAudio,
  onSelectLocation,
  onSelectContact,
  onSelectSticker
}) => {
  const { isDayMode } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ATTACHMENT_ITEMS = [
    {
      id: 'document',
      label: 'Document',
      sublabel: 'All files',
      icon: FileText,
      bgGradient: 'from-violet-500 to-purple-600',
      action: () => {
        onClose();
        onSelectDocument();
      }
    },
    {
      id: 'camera',
      label: 'Camera',
      sublabel: 'Photo / Video',
      icon: Camera,
      bgGradient: 'from-rose-500 to-pink-600',
      action: () => {
        onClose();
        onSelectCamera();
      }
    },
    {
      id: 'gallery',
      label: 'Gallery',
      sublabel: 'Photos & Videos',
      icon: ImageIcon,
      bgGradient: 'from-purple-500 to-indigo-600',
      action: () => {
        onClose();
        onSelectGallery();
      }
    },
    {
      id: 'video',
      label: 'Video',
      sublabel: 'Upload clips',
      icon: Film,
      bgGradient: 'from-sky-500 to-cyan-600',
      action: () => {
        onClose();
        onSelectVideo();
      }
    },
    {
      id: 'audio',
      label: 'Audio',
      sublabel: 'Music & voice',
      icon: Headphones,
      bgGradient: 'from-amber-500 to-orange-600',
      action: () => {
        onClose();
        onSelectAudio();
      }
    },
    {
      id: 'location',
      label: 'Location',
      sublabel: 'Share GPS place',
      icon: MapPin,
      bgGradient: 'from-emerald-500 to-teal-600',
      action: () => {
        onClose();
        onSelectLocation();
      }
    },
    {
      id: 'contact',
      label: 'Contact',
      sublabel: 'Share person',
      icon: User,
      bgGradient: 'from-blue-500 to-indigo-600',
      action: () => {
        onClose();
        onSelectContact();
      }
    },
    {
      id: 'sticker',
      label: 'Stickers',
      sublabel: 'Cute & Fun',
      icon: Sparkles,
      bgGradient: 'from-fuchsia-500 to-pink-500',
      action: () => {
        onClose();
        onSelectSticker();
      }
    }
  ];

  return (
    <div
      ref={menuRef}
      className={`absolute bottom-16 left-3 sm:left-4 z-40 p-3.5 sm:p-4 rounded-3xl border shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-4 duration-200 w-[280px] sm:w-[320px] max-w-[calc(100vw-24px)] ${
        isDayMode
          ? 'bg-white/95 border-emerald-100 text-slate-800 shadow-emerald-900/10'
          : 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/40'
      }`}
    >
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-black/5 dark:border-white/10">
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">
          Share &amp; Attach
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 4 columns x 2 rows WhatsApp-style circular icon grid */}
      <div className="grid grid-cols-4 gap-y-3 gap-x-2 text-center">
        {ATTACHMENT_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className="flex flex-col items-center group cursor-pointer p-1 rounded-2xl transition-transform hover:scale-105 active:scale-95"
            >
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-tr ${item.bgGradient} text-white flex items-center justify-center shadow-md shadow-black/15 group-hover:shadow-lg transition-all`}
              >
                <Icon className="w-5 h-5 drop-shadow-xs" />
              </div>
              <span className="text-[11px] font-semibold mt-1.5 truncate max-w-full leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
