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

function getAvatarColors(avatar: AvatarData | null | undefined, name: string) {
  if (avatar?.type === 'gradient' && avatar.gradient) {
    return avatar.gradient;
  }
  return getDefaultGradient(name);
}

export function UserAvatar({
  avatar,
  name,
  size = 40,
  className = '',
  showRing = false,
  presence = 'online',
  glow = false,
  animatedBorder = true,
}: {
  avatar?: AvatarData | null;
  name: string;
  size?: number;
  className?: string;
  showRing?: boolean;
  presence?: 'online' | 'away' | 'busy' | 'offline';
  glow?: boolean;
  animatedBorder?: boolean;
}) {
  const fontSize = Math.max(14, Math.round(size * 0.38));
  const ringClass = showRing ? 'ring-1 ring-white/10 ring-offset-2 ring-offset-surface-card' : '';
  const statusColor =
    presence === 'busy'
      ? '#ef4444'
      : presence === 'away'
        ? '#f59e0b'
        : presence === 'offline'
          ? '#6b7280'
          : '#22c55e';
  const glowShadow = glow
    ? presence === 'busy'
      ? '0 0 0 1px rgba(239,68,68,0.2), 0 0 22px rgba(239,68,68,0.25)'
      : presence === 'away'
        ? '0 0 0 1px rgba(245,158,11,0.2), 0 0 22px rgba(245,158,11,0.22)'
        : presence === 'offline'
          ? '0 0 0 1px rgba(107,114,128,0.18), 0 0 12px rgba(107,114,128,0.18)'
          : '0 0 0 1px rgba(34,197,94,0.2), 0 0 22px rgba(34,197,94,0.24)'
    : undefined;
  const hasAnimatedBorder = animatedBorder && avatar?.type !== 'image';
  const avatarBg = getAvatarBackground(avatar, name);
  const avatarColors = getAvatarColors(avatar, name);
  const wrapperSize = size;
  const innerSize = Math.max(0, size - (hasAnimatedBorder ? 4 : 0));
  const baseWrapperClass = `relative inline-flex items-center justify-center shrink-0 ${className}`.trim();

  const withPresence = (child: React.ReactNode) => (
    <div
      className={baseWrapperClass}
      style={{ width: wrapperSize, height: wrapperSize, filter: glowShadow ? 'drop-shadow(0 0 0 transparent)' : undefined }}
      title={name}
    >
      <div style={{ boxShadow: glowShadow }} className="rounded-full">
        {child}
      </div>
      <span
        className="absolute bottom-[1px] right-[1px] rounded-full border-2 border-surface-card"
        style={{ width: Math.max(9, size * 0.24), height: Math.max(9, size * 0.24), backgroundColor: statusColor }}
      />
    </div>
  );

  if (avatar?.type === 'image' && avatar.imageUrl) {
    return withPresence(
      <div
        className={`relative overflow-hidden rounded-full shadow-lg bg-surface-border ${ringClass}`.trim()}
        style={{ width: size, height: size }}
      >
        <img
          src={avatar.imageUrl}
          alt={name}
          className="block h-full w-full object-cover object-center"
          draggable={false}
        />
      </div>
    );
  }

  if (avatar?.type === 'emoji' && avatar.emoji) {
    const emojiCore = (
      <div
        className={`rounded-full flex items-center justify-center shadow-lg bg-surface-border ${ringClass}`.trim()}
        style={{ width: innerSize, height: innerSize, fontSize: fontSize * 1.2 }}
      >
        {avatar.emoji}
      </div>
    );

    return withPresence(
      hasAnimatedBorder ? (
        <div
          className="flowa-avatar-animated-ring rounded-full p-[2px]"
          style={{ width: size, height: size, backgroundImage: `conic-gradient(from 0deg, ${avatarColors.from}, ${avatarColors.to}, rgba(255,255,255,0.2), ${avatarColors.from})` }}
        >
          {emojiCore}
        </div>
      ) : emojiCore
    );
  }

  const initial = name.trim().charAt(0).toUpperCase();
  const gradientCore = (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold uppercase select-none shadow-lg ${ringClass}`.trim()}
      style={{ width: innerSize, height: innerSize, fontSize, background: avatarBg }}
    >
      {initial || <User size={Math.max(14, size * 0.35)} />}
    </div>
  );

  return withPresence(
    hasAnimatedBorder ? (
      <div
        className="flowa-avatar-animated-ring rounded-full p-[2px]"
        style={{ width: size, height: size, backgroundImage: `conic-gradient(from 0deg, rgba(255,255,255,0.10), ${avatarColors.from}, ${avatarColors.to}, rgba(255,255,255,0.18), ${avatarColors.from})` }}
      >
        {gradientCore}
      </div>
    ) : gradientCore
  );
}
