import { useNavigate } from 'react-router-dom';
import ScreenTopPanel, { ScreenTopBar } from './ScreenTopPanel';

function ChevronLeftIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export default function PageHeader({ title, backTo, rightAction = null }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <ScreenTopPanel>
      <ScreenTopBar>
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-900 transition hover:bg-black/[0.04] active:bg-black/[0.06]"
          aria-label="Назад"
        >
          <ChevronLeftIcon />
        </button>

        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-slate-900">{title}</h1>

        <div className="flex h-10 w-10 shrink-0 items-center justify-end">
          {rightAction ?? <span className="block h-10 w-10 shrink-0" aria-hidden />}
        </div>
      </ScreenTopBar>
    </ScreenTopPanel>
  );
}
