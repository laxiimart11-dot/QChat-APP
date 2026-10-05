export interface MediaSticker {
  id: string;
  name: string;
  category: 'cute' | 'reactions' | 'love' | 'work' | 'desi';
  url: string;
}

export interface MediaGif {
  id: string;
  title: string;
  category: 'trending' | 'reactions' | 'happy' | 'love' | 'funny' | 'hello' | 'dance';
  url: string;
}

export const PRESET_STICKERS: MediaSticker[] = [
  // Cute Animals
  {
    id: 'st_cat_heart',
    name: 'Love Cat',
    category: 'cute',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=260&auto=format&fit=crop&q=80'
  },
  {
    id: 'st_dog_happy',
    name: 'Happy Puppy',
    category: 'cute',
    url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=260&auto=format&fit=crop&q=80'
  },
  {
    id: 'st_panda',
    name: 'Cute Panda',
    category: 'cute',
    url: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=260&auto=format&fit=crop&q=80'
  },
  {
    id: 'st_bunny',
    name: 'Fluffy Bunny',
    category: 'cute',
    url: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=260&auto=format&fit=crop&q=80'
  },

  // Reactions
  {
    id: 'st_awesome',
    name: 'Awesome!',
    category: 'reactions',
    url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=260&auto=format&fit=crop&q=80'
  },
  {
    id: 'st_congrats',
    name: 'Congrats!',
    category: 'reactions',
    url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=260&auto=format&fit=crop&q=80'
  },
  {
    id: 'st_celebrate',
    name: 'Celebration',
    category: 'reactions',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=260&auto=format&fit=crop&q=80'
  },
  {
    id: 'st_thumbsup',
    name: 'Superb',
    category: 'reactions',
    url: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=260&auto=format&fit=crop&q=80'
  },

  // Love & Friendship
  {
    id: 'st_love_rose',
    name: 'Red Rose',
    category: 'love',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=260&auto=format&fit=crop&q=80'
  },
  {
    id: 'st_love_heart',
    name: 'Heart Balloons',
    category: 'love',
    url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=260&auto=format&fit=crop&q=80'
  },
  {
    id: 'st_together',
    name: 'Best Friends',
    category: 'love',
    url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=260&auto=format&fit=crop&q=80'
  },

  // Work & Coffee
  {
    id: 'st_coffee',
    name: 'Coffee Break',
    category: 'work',
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=260&auto=format&fit=crop&q=80'
  },
  {
    id: 'st_laptop',
    name: 'Coding & Work',
    category: 'work',
    url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=260&auto=format&fit=crop&q=80'
  },
  {
    id: 'st_ideas',
    name: 'Great Idea',
    category: 'work',
    url: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=260&auto=format&fit=crop&q=80'
  },

  // Greetings & Desi
  {
    id: 'st_salaam',
    name: 'Warm Welcome',
    category: 'desi',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=260&auto=format&fit=crop&q=80'
  },
  {
    id: 'st_tea',
    name: 'Chai Time',
    category: 'desi',
    url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=260&auto=format&fit=crop&q=80'
  },
  {
    id: 'st_smile',
    name: 'Big Smile',
    category: 'desi',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=260&auto=format&fit=crop&q=80'
  }
];

export const PRESET_GIFS: MediaGif[] = [
  // Trending / Fun
  {
    id: 'gif_cheers',
    title: 'Cheers Celebration',
    category: 'trending',
    url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif'
  },
  {
    id: 'gif_excited',
    title: 'Super Excited',
    category: 'trending',
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif'
  },
  {
    id: 'gif_applause',
    title: 'Round of Applause',
    category: 'reactions',
    url: 'https://media.giphy.com/media/fnK0jeA8vIh2QLq3IZ/giphy.gif'
  },
  {
    id: 'gif_mindblown',
    title: 'Mind Blown',
    category: 'reactions',
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif'
  },
  {
    id: 'gif_thumbsup',
    title: 'Yes / Thumbs Up',
    category: 'reactions',
    url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif'
  },
  {
    id: 'gif_laugh',
    title: 'Laughing Out Loud',
    category: 'funny',
    url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif'
  },
  {
    id: 'gif_funny_cat',
    title: 'Funny Cat',
    category: 'funny',
    url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif'
  },
  {
    id: 'gif_dance',
    title: 'Happy Dance',
    category: 'dance',
    url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif'
  },
  {
    id: 'gif_celebrate',
    title: 'Party Time',
    category: 'dance',
    url: 'https://media.giphy.com/media/l2JIdnF6aJnAqzDgY/giphy.gif'
  },
  {
    id: 'gif_hello',
    title: 'Wave Hello',
    category: 'hello',
    url: 'https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif'
  },
  {
    id: 'gif_bye',
    title: 'Bye Bye Wave',
    category: 'hello',
    url: 'https://media.giphy.com/media/m9eG1qVjvN56H0MXt8/giphy.gif'
  },
  {
    id: 'gif_love_heart',
    title: 'Sending Love & Heart',
    category: 'love',
    url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif'
  },
  {
    id: 'gif_hugs',
    title: 'Warm Hug',
    category: 'love',
    url: 'https://media.giphy.com/media/3M4NpbLCTxBqU/giphy.gif'
  }
];

export interface EmojiCategory {
  name: string;
  icon: string;
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Smileys & Emotion',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋',
      '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
      '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌',
      '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
      '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'
    ]
  },
  {
    name: 'Gestures & People',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
      '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅'
    ]
  },
  {
    name: 'Hearts & Love',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌',
      '💋', '💍', '💎', '💐', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻'
    ]
  },
  {
    name: 'Animals & Nature',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅',
      '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌',
      '🐞', '🐜', '🐢', '🐍', '🦎', '🦖', '🐙', '🦑', '🦐', '🦀',
      '🐡', '🐠', '🐟', '🐬', '🐳', '🦈', '🐊', '🐅', '🐆', '🦓'
    ]
  },
  {
    name: 'Food & Drink',
    icon: '🍕',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒',
      '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🥔', '🥕',
      '🌽', '🌶️', '🥒', '🥬', '🥦', '🍄', '🥜', '🌰', '🍞', '🥐',
      '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍗', '🥩', '🍔', '🍟',
      '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🍳', '🥘', '🍲', '🥣',
      '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛',
      '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟',
      '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫',
      '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🧃', '🥤'
    ]
  },
  {
    name: 'Activities & Travel',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
      '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🏹',
      '🎣', '🤿', '🥊', '🥋', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿',
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
      '🚚', '🚛', '🚜', '🛵', '🏍️', '🛺', '🚲', '🛴', '🚨', '🚔',
      '✈️', '🛫', '🛬', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛳️'
    ]
  },
  {
    name: 'Objects & Symbols',
    icon: '💡',
    emojis: [
      '💡', '🔦', '🕯️', '🪔', '🏮', '📱', '📲', '💻', '⌨️', '🖥️',
      '🖨️', '🖱️', '📷', '📸', '📹', '🎥', '📽️', '🎬', '📞', '☎️',
      '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰',
      '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💰', '🪙', '💵', '💳',
      '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️',
      '🔒', '🔓', '🔏', '🔐', '🔑', '🗝️', '🔔', '🔕', '🎉', '🎊',
      '🎁', '🎈', '🏆', '🥇', '🥈', '🥉', '💯', '🔥', '✨', '⚡'
    ]
  }
];
