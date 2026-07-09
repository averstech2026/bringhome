import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import PageHeader from '../components/layout/PageHeader';
import FeedbackModal from '../components/profile/FeedbackModal';
import { subscribeToUserFeedbacks, markUserFeedbackStatusesSeen, FEEDBACK_CATEGORIES } from '../services/feedbacksService';
import { getFeedbackStatusMeta } from '../utils/feedbackStatus';

function formatFeedbackDate(timestamp) {
  if (!timestamp?.toDate) return '';
  return timestamp.toDate().toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FeedbackCard({ feedback }) {
  const category = FEEDBACK_CATEGORIES[feedback.category] || {
    label: feedback.category,
    emoji: '💬',
  };
  const statusMeta = getFeedbackStatusMeta(feedback);

  return (
    <li className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">
          <span aria-hidden className="mr-1.5">{category.emoji}</span>
          {category.label}
        </p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusMeta.badgeClass}`}
        >
          {statusMeta.label}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
        {feedback.text}
      </p>
      {feedback.createdAt && (
        <p className="mt-3 text-xs text-slate-400">{formatFeedbackDate(feedback.createdAt)}</p>
      )}
    </li>
  );
}

export default function MyFeedbacksPage() {
  const { user } = useAuth();
  const { familyId, profile } = useUserProfile(user);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const name = profile?.displayName || user?.displayName || 'Пользователь';

  useEffect(() => {
    if (!user?.uid) {
      setFeedbacks([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setLoadError('');
    return subscribeToUserFeedbacks(
      user.uid,
      (items) => {
        setFeedbacks(items);
        setLoading(false);
      },
      () => setLoadError('Не удалось загрузить обращения. Попробуйте обновить страницу.'),
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || loading) return undefined;

    markUserFeedbackStatusesSeen(user.uid).catch(() => {});
    return undefined;
  }, [user?.uid, loading]);

  return (
    <div className="flex min-h-full flex-col px-4 pb-10 pt-0">
      <PageHeader title="Мои обращения" backTo="/settings" />

      <div className="pt-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden />
            Создать
          </button>
        </div>

        {loadError && (
          <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {loadError}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">Обращений пока нет</p>
            <p className="mt-1 text-sm text-slate-400">
              Нажмите кнопку выше, чтобы сообщить об ошибке или предложить улучшение
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {feedbacks.map((feedback) => (
              <FeedbackCard key={feedback.id} feedback={feedback} />
            ))}
          </ul>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Статус обновляется, когда команда разработки обрабатывает ваше обращение
        </p>
      </div>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        userId={user?.uid}
        familyId={familyId}
        displayName={name}
      />
    </div>
  );
}
