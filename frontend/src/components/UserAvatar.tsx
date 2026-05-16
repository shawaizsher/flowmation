import { User } from 'lucide-react';

export type AvatarType = 'gradient' | 'emoji' | 'image';

export interface AvatarData {
  type: AvatarType;
  gradient?: { from: string; to: string };
  emoji?: string;
  imageUrl?: string;
}

export const AVATAR_GRADIENTS = [
  { id: 'ocean', label: 'Ocean', from: '#3b82f6', to: '#06b6d4' },
  { id: 'sunset', label: 'Sunset', from: '#f97316', to: '#ef4444' },
  { id: 'forest', label: 'Forest', from: '#22c55e', to: '#16a34a' },
  { id: 'violet', label: 'Violet', from: '#8b5cf6', to: '#6366f1' },
  { id: 'rose', label: 'Rose', from: '#ec4899', to: '#f43f5e' },
  { id: 'gold', label: 'Gold', from: '#f59e0b', to: '#f97316' },
  { id: 'teal', label: 'Teal', from: '#14b8a6', to: '#0ea5e9' },
  { id: 'slate', label: 'Slate', from: '#64748b', to: '#334155' },
  { id: 'candy', label: 'Candy', from: '#f472b6', to: '#c084fc' },
  { id: 'mint', label: 'Mint', from: '#34d399', to: '#3b82f6' },
  { id: 'crimson', label: 'Crimson', from: '#ef4444', to: '#7c3aed' },
  { id: 'dawn', label: 'Dawn', from: '#fbbf24', to: '#f472b6' },
];

export const AVATAR_EMOJIS = [
  '😀', '😎', '🤓', '🧑‍💻', '👨‍💻', '👩‍💻', '🧑‍🎨', '🧑‍🚀', '🥷', '🦊',
  '🐺', '🦁', '🐉', '🦅', '🐬', '🦄', '🐙', '⚡', '🔥', '✨',
  '🚀', '💎', '🎯', '🌊', '🌙', '⭐', '🎭', '🏆', '💡', '🎮',
  '🌈', '🎪', '🧩', '🎵', '📈', '🛠️',
];

export function getDefaultGradient(name: string) {
  const trimmed = name.trim();
  const hue = trimmed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return {
    from: `hsl(${hue}, 72%, 56%)`,
    to: `hsl(${(hue + 42) % 360}, 72%, 44%)`,
  };
}

export function getAvatarBackground(avatar: AvatarData | null | undefined, name: string) {
  if (avatar?.type === 'gradient' && avatar.gradient) {
    return `linear-gradient(135deg, ${avatar.gradient.from}, ${avatar.gradient.to})`;
  }
  const fallback = getDefaultGradient(name);
  return `linear-gradient(135deg, ${fallback.from}, ${fallback.to})`;
}

export function UserAvatar({
  avatar,
  name,
  size = 40,
  className = '',
  showRing = false,
}: {
  avatar?: AvatarData | null;
  name: string;
  size?: number;
  className?: string;
  showRing?: boolean;
}) {
  const fontSize = Math.max(14, Math.round(size * 0.38));
  const ringClass = showRing ? 'ring-1 ring-white/10 ring-offset-2 ring-offset-surface-card' : '';

  if (avatar?.type === 'image' && avatar.imageUrl) {
    return (
      <img
        src={avatar.imageUrl}
        alt={name}
        className={`rounded-full object-cover shadow-lg shrink-0 ${ringClass} ${className}`.trim()}
        style={{ width: size, height: size }}
      />
    );
  }

  if (avatar?.type === 'emoji' && avatar.emoji) {
    return (
      <div
        className={`rounded-full flex items-center justify-center shadow-lg shrink-0 bg-surface-border ${ringClass} ${className}`.trim()}
        style={{ width: size, height: size, fontSize: fontSize * 1.2 }}
        title={name}
      >
        {avatar.emoji}
      </div>
    );
  }

  const bg = getAvatarBackground(avatar, name);
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold uppercase select-none shadow-lg shrink-0 ${ringClass} ${className}`.trim()}
      style={{ width: size, height: size, fontSize, background: bg }}
      title={name}
    >
      {initial || <User size={Math.max(14, size * 0.35)} />}
    </div>
  );
}
