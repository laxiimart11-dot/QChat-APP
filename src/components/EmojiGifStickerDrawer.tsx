import React, { useState, useMemo } from 'react';
import {
  Smile,
  Film,
  Sparkles,
  Search,
  X,
  Send
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  EMOJI_CATEGORIES,
  PRESET_GIFS,
  PRESET_STICKERS,
  type MediaGif,
  type MediaSticker
} from '../data/richMediaData.ts';

interface EmojiGifStickerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSendGif: (gifUrl: string, title?: string) => void;
  onSendSticker: (stickerUrl: string, name?: string) => void;
}

export const EmojiGifStickerDrawer: React.FC<EmojiGifStickerDrawerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  onSendGif,
  onSendSticker
}) => {
  const { isDayMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'emoji' | 'gif' | 'sticker'>('emoji');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<string>(
    EMOJI_CATEGORIES[0]?.name || ''
  );
  const [gifCategory, setGifCategory] = useState<string>('all');
  const [stickerCategory, setStickerCategory] = useState<string>('all');

  // Filtered emojis
  const filteredEmojiCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return EMOJI_CATEGORIES;
    }
    const q = searchQuery.toLowerCase();
    return EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter((e) => e.includes(q))
    })).filter((cat) => cat.emojis.length > 0);
  }, [searchQuery]);

  // Filtered GIFs
  const filteredGifs = useMemo(() => {
    let list = PRESET_GIFS;
    if (gifCategory !== 'all') {
      list = list.filter((g) => g.category === gifCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((g) => g.title.toLowerCase().includes(q) || g.category.includes(q));
    }
    return list;
  }, [gifCategory, searchQuery]);

  // Filtered Stickers
  const filteredStickers = useMemo(() => {
    let list = PRESET_STICKERS;
    if (stickerCategory !== 'all') {
      list = list.filter((s) => s.category === stickerCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.category.includes(q));
    }
    return list;
  }, [stickerCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className={`border-t flex flex-col h-64 sm:h-72 transition-all animate-in slide-in-from-bottom-6 duration-200 z-30 select-none ${
        isDayMode
          ? 'bg-white border-emerald-100 text-slate-800'
          : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}
    >
      {/* Top Search & Close Bar */}
      <div className="p-2 border-b flex items-center space-x-2 shrink-0 border-black/5 dark:border-white/10">
        <div
          className={`flex-1 flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs ${
            isDayMode
              ? 'bg-[#F1FAF5] border-emerald-100 text-slate-800'
              : 'bg-slate-950 border-slate-800 text-slate-200'
          }`}
        >
          <Search className="w-3.5 h-3.5 opacity-60 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'emoji'
                ? 'Search emojis...'
                : activeTab === 'gif'
                ? 'Search GIFs (happy, dance, laugh)...'
                : 'Search stickers...'
            }
            className="w-full bg-transparent outline-none text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="opacity-60 hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 cursor-pointer"
          title="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* TAB 1: EMOJIS */}
        {activeTab === 'emoji' && (
          <div className="space-y-4">
            {filteredEmojiCategories.map((category) => (
              <div key={category.name} className="space-y-1.5">
                <div className="text-[11px] font-bold opacity-60 uppercase tracking-wider flex items-center space-x-1.5">
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </div>
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                  {category.emojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectEmoji(emoji)}
                      className="h-9 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-xl flex items-center justify-center transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: GIFS */}
        {activeTab === 'gif' && (
          <div className="space-y-3">
            {/* Quick Category Chips */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs shrink-0 no-scrollbar">
              {['all', 'trending', 'reactions', 'happy', 'funny', 'dance', 'love', 'hello'].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setGifCategory(cat)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                      gifCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            {/* GIFs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredGifs.map((gif) => (
                <div
                  key={gif.id}
                  onClick={() => onSendGif(gif.url, gif.title)}
                  className="group relative rounded-xl overflow-hidden cursor-pointer border border-black/10 dark:border-white/10 aspect-video bg-black/5 hover:border-indigo-500 transition-all shadow-xs"
                >
                  <img
                    src={gif.url}
                    alt={gif.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
                    <span className="flex items-center space-x-1 bg-indigo-600 px-2.5 py-1 rounded-full shadow-md">
                      <span>Send</span>
                      <Send className="w-3 h-3" />
                    </span>
                  </div>
                  <span className="absolute bottom-1 left-1.5 text-[9px] text-white/90 bg-black/60 px-1.5 py-0.5 rounded font-medium truncate max-w-[90%]">
                    {gif.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: STICKERS */}
        {activeTab === 'sticker' && (
          <div className="space-y-3">
            {/* Quick Category Chips */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs shrink-0 no-scrollbar">
              {['all', 'cute', 'reactions', 'love', 'work', 'desi'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setStickerCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                    stickerCategory === cat
                      ? 'bg-fuchsia-600 text-white'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Stickers Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filteredStickers.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => onSendSticker(sticker.url, sticker.name)}
                  className="p-2 rounded-2xl border border-black/5 dark:border-white/5 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10 flex flex-col items-center group transition-all cursor-pointer shadow-xs"
                >
                  <img
                    src={sticker.url}
                    alt={sticker.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <span className="text-[10px] font-semibold mt-1 opacity-75 truncate max-w-full">
                    {sticker.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tabs Bar (WhatsApp style: Emoji, GIF, Stickers) */}
      <div className="h-11 px-4 border-t flex items-center justify-around shrink-0 border-black/5 dark:border-white/10 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('emoji')}
          className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-full font-bold transition-colors cursor-pointer ${
            activeTab === 'emoji'
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          <Smile className="w-4 h-4" />
          <span>Emoji</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gif')}
          className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-full font-bold transition-colors cursor-pointer ${
            activeTab === 'gif'
              ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>GIF</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sticker')}
          className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-full font-bold transition-colors cursor-pointer ${
            activeTab === 'sticker'
              ? 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Stickers</span>
        </button>
      </div>
    </div>
  );
};
