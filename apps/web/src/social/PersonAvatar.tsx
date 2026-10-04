import type { SocialPerson } from '@boardgame/protocol';

export const avatars = [
  { id: 'dice', label: '骰子', symbol: '🎲' },
  { id: 'leaf', label: '绿叶', symbol: '🌿' },
  { id: 'cat', label: '猫咪', symbol: '🐱' },
  { id: 'rocket', label: '火箭', symbol: '🚀' },
  { id: 'star', label: '星星', symbol: '⭐' },
  { id: 'coffee', label: '咖啡', symbol: '☕' },
] as const;

export function PersonAvatar({ person }: { person: SocialPerson }) {
  const avatar = avatars.find(item => item.id === person.avatar)!;
  return <span className="social-avatar" data-avatar={avatar.id} role="img" aria-label={person.displayName + ' 的头像：' + avatar.label}>{avatar.symbol}</span>;
}
