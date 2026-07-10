import { Sparkles, Sword, Wand2 } from 'lucide-react';

function AiThemeIcon({ icon, className }) {
  if (icon === 'wand') {
    return <Wand2 className={className} strokeWidth={2} aria-hidden />;
  }
  if (icon === 'sword') {
    return <Sword className={className} strokeWidth={2} aria-hidden />;
  }
  return <Sparkles className={className} strokeWidth={2} aria-hidden />;
}

export default function AiJumpButton({ onClick, disabled, aiJumpTheme }) {
  if (!onClick || !aiJumpTheme) return null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-40 ${aiJumpTheme.jumpChipClassName}`}
    >
      <AiThemeIcon icon={aiJumpTheme.icon} className="h-3.5 w-3.5 shrink-0" />
      ИИ-ввод
    </button>
  );
}
