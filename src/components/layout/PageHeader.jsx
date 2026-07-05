import { useNavigate } from 'react-router-dom';

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
    <header className="sticky top-0 z-50 border-b border-gray-100/60 bg-white/95 px-4 py-3 backdrop-blur-md">
      <div className="grid grid-cols-3 items-center">
        <div className="flex justify-start">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-900 transition hover:bg-black/[0.04] active:bg-black/[0.06]"
            aria-label="Назад"
          >
            <ChevronLeftIcon />
          </button>
        </div>

        <h1 className="truncate text-center text-lg font-bold text-gray-900">{title}</h1>

        <div className="flex justify-end">
          {rightAction ?? <div className="h-10 w-10" aria-hidden />}
        </div>
      </div>
    </header>
  );
}
