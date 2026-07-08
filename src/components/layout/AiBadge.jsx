const AI_BADGE_ICON = `${import.meta.env.BASE_URL}icons/ai-badge.png`;

export default function AiBadge({ className = 'h-[18px] w-[18px]' }) {
  return (
    <img
      src={AI_BADGE_ICON}
      alt="AI"
      className={`shrink-0 rounded-[4px] object-cover ${className}`}
      width={18}
      height={18}
      decoding="async"
    />
  );
}
