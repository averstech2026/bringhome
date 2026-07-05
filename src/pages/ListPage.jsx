import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { getUserPhotoUrl } from '../utils/userPhoto';
import { useList } from '../hooks/useList';
import { useItems } from '../hooks/useItems';
import { useListDraft, toDraftItem } from '../hooks/useListDraft';
import { decodeListTypeFromUrl, encodeListTypeForUrl } from '../services/listsService';
import { ensureListAccess, ensureArchivedListAccess, saveToProductHistory, getListItemsForRepeat } from '../services/listsService';
import { groupItemsByCategory, getListProgress } from '../utils/groupByCategory';
import StatusBar from '../components/list/StatusBar';
import CategoryGroup from '../components/list/CategoryGroup';
import AddItemForm from '../components/list/AddItemForm';
import AiInput from '../components/list/AiInput';
import ShareControls from '../components/list/ShareControls';
import ListTypeBadge from '../components/list/ListTypeBadge';
import DraftTypeSwitcher from '../components/list/DraftTypeSwitcher';
import RepeatListModal from '../components/home/RepeatListModal';
import { saveRepeatDraft } from '../utils/repeatDraftStorage';
import {
  CARD_SURFACE,
  CARD_PAD_V,
  HINT_TEXT,
  APP_BACKGROUND,
  PAGE_X,
  STICKY_TOP,
  PRIMARY_BTN,
} from '../components/list/cardStyles';

export default function ListPage() {
  const { listId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, displayName } = useAuth();
  const { profile } = useUserProfile(user);
  const userPhotoUrl = getUserPhotoUrl(user, profile);

  const isDraft = listId === 'new';
  const isArchivedView = searchParams.get('archived') === '1';
  const listType = decodeListTypeFromUrl(searchParams.get('type'));

  const {
    draftList,
    draftItems,
    persisting,
    toggleDraftItem,
    updateDraftItemQuantity,
    removeDraftItem,
    persistDraft,
    persistWithItems,
  } = useListDraft(listType);

  const [accessError, setAccessError] = useState(null);
  const [accessChecked, setAccessChecked] = useState(isDraft);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatBusy, setRepeatBusy] = useState(false);

  const handleDraftTypeChange = (newType) => {
    if (newType === listType) return;
    setSearchParams({ type: encodeListTypeForUrl(newType) }, { replace: true });
  };

  const canLoadList = !isDraft && accessChecked && !accessError;

  const { list, loading: listLoading, error: listError } = useList(canLoadList ? listId : null);
  const { items: liveItems, loading: itemsLoading, error: itemsError } = useItems(canLoadList ? listId : null);

  useEffect(() => {
    if (isDraft || !listId || !user) return;

    setAccessChecked(false);
    const checkAccess = isArchivedView ? ensureArchivedListAccess(listId) : ensureListAccess(listId, user.uid);

    checkAccess
      .then(({ allowed, reason }) => {
        if (!allowed) {
          setAccessError(
            reason === 'not_found'
              ? 'Список не найден'
              : reason === 'archived'
                ? 'archived'
                : reason === 'not_archived'
                  ? 'not_archived'
                  : reason === 'no_access'
                    ? 'Нет доступа'
                    : 'Нет доступа',
          );
        } else {
          setAccessError(null);
        }
      })
      .catch(() => setAccessError('Ошибка доступа'))
      .finally(() => setAccessChecked(true));
  }, [listId, user, isDraft, isArchivedView]);

  const activeList = isDraft ? draftList : list;
  const items = isDraft ? draftItems : liveItems;
  const loading = isDraft ? false : !accessChecked || listLoading || itemsLoading;

  const grouped = groupItemsByCategory(items);
  const { allDone, total } = getListProgress(items);

  const handleDraftManualAdd = async (itemData) => {
    await saveToProductHistory(user.uid, itemData.name);
    const newItem = toDraftItem(itemData);
    await persistDraft(user.uid, [newItem]);
  };

  const handleDraftAiAdd = async (products) => {
    const newItems = products.map((p) => toDraftItem(p));
    await persistDraft(user.uid, newItems);
  };

  const handleCreateList = async () => {
    await persistWithItems(user.uid, draftItems);
  };

  const handleRepeatConfirm = async (type) => {
    if (!list) return;

    setRepeatBusy(true);
    try {
      const repeatItems = await getListItemsForRepeat(list.id);
      saveRepeatDraft({ repeatItems, repeatFrom: list.id, type });
      navigate(`/list/new?type=${encodeListTypeForUrl(type)}`);
    } catch (err) {
      window.alert(err?.message || 'Не удалось загрузить товары списка');
    } finally {
      setRepeatBusy(false);
      setRepeatOpen(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex min-h-full items-center justify-center ${APP_BACKGROUND}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  if (!isDraft && (accessError || listError || itemsError || !list)) {
    return (
      <div className={`flex min-h-full flex-col items-center justify-center ${APP_BACKGROUND} ${PAGE_X}`}>
        <p className="text-center text-slate-500">
          {accessError === 'archived'
            ? 'Список в архиве'
            : accessError === 'not_archived'
              ? 'Список не в архиве'
            : accessError || listError || itemsError || 'Список не найден'}
        </p>
        {(listError || itemsError || '')?.toLowerCase().includes('permission') && (
          <p className="mt-2 max-w-xs text-center text-xs text-slate-400">
            Задеплойте правила Firestore: firebase deploy --only firestore:rules
          </p>
        )}
        <Link to={isArchivedView ? '/settings' : '/'} className="mt-4 text-sm font-medium text-slate-700">
          {isArchivedView ? 'В профиль' : 'На главную'}
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex min-h-full flex-col ${APP_BACKGROUND}`}>
      <header className={`${STICKY_TOP} ${PAGE_X} pb-3 pt-2`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(isArchivedView ? '/settings' : '/')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-800 transition hover:bg-black/[0.04] active:bg-black/[0.06]"
            aria-label="Назад"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1 className="truncate text-[20px] font-bold tracking-tight text-slate-900">
              {activeList.title}
            </h1>
            {!isDraft && <ListTypeBadge type={activeList.type} />}
            {isArchivedView && (
              <span className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                В архиве
              </span>
            )}
            {!isDraft && !isArchivedView && activeList.isPublic && (
              <span className="inline-flex shrink-0 items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                Общий
              </span>
            )}
          </div>
        </div>

        {isDraft && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              Тип списка
            </p>
            <DraftTypeSwitcher
              value={listType}
              onChange={handleDraftTypeChange}
              disabled={persisting}
            />
          </div>
        )}

        <div className="mt-3">
          <StatusBar items={items} />
        </div>
      </header>

      <main className={`${PAGE_X} flex flex-1 flex-col gap-3 pb-28 pt-3`}>
        <div className={`${CARD_SURFACE} ${CARD_PAD_V}`}>
          {grouped.length === 0 ? (
            <p className={HINT_TEXT}>
              {isDraft
                ? 'Добавьте продукты или нажмите «Создать список»'
                : isArchivedView
                  ? 'В архивном списке нет товаров'
                  : 'Список пуст — добавьте продукты ниже'}
            </p>
          ) : (
            <div className="space-y-1">
              {grouped.map(([category, categoryItems], index) => (
                <CategoryGroup
                  key={category}
                  category={category}
                  items={categoryItems}
                  displayName={displayName}
                  userPhotoUrl={userPhotoUrl}
                  isFirst={index === 0}
                  readOnly={isArchivedView}
                  onToggle={isDraft ? toggleDraftItem : undefined}
                  onQuantityChange={isDraft ? updateDraftItemQuantity : undefined}
                  onRemove={isDraft ? removeDraftItem : undefined}
                  disabled={persisting}
                />
              ))}
            </div>
          )}
        </div>

        {!isArchivedView && (
          <>
            <AddItemForm
              listId={isDraft ? null : listId}
              userId={user.uid}
              isDraft={isDraft}
              onDraftAdd={handleDraftManualAdd}
              disabled={persisting}
            />
            <AiInput
              listId={isDraft ? null : listId}
              isDraft={isDraft}
              onDraftAdd={handleDraftAiAdd}
              disabled={persisting}
            />
            {!isDraft && (
              <ShareControls
                list={list}
                listId={listId}
                currentUserId={user.uid}
                currentUserAvatarUrl={userPhotoUrl}
              />
            )}
          </>
        )}
      </main>

      <footer className={`fixed bottom-0 left-1/2 w-full max-w-lg -translate-x-1/2 border-t border-gray-200/60 bg-[#f5f5f7]/95 backdrop-blur-md ${PAGE_X} py-4`}>
        {isDraft ? (
          <button
            type="button"
            onClick={handleCreateList}
            className={PRIMARY_BTN}
            disabled={persisting}
          >
            {persisting ? 'Создаём…' : 'Создать список'}
          </button>
        ) : isArchivedView ? (
          <button
            type="button"
            onClick={() => setRepeatOpen(true)}
            className={PRIMARY_BTN}
            disabled={repeatBusy}
          >
            Повторить список
          </button>
        ) : (
          <button
            type="button"
            disabled={!allDone || total === 0}
            className={`${PRIMARY_BTN} ${
              !(allDone && total > 0) ? '!bg-gray-100 !text-slate-400 !shadow-none hover:!bg-gray-100 hover:!shadow-none active:!scale-100' : ''
            }`}
          >
            {allDone && total > 0 ? 'Готово!' : total === 0 ? 'Добавьте товары' : 'Соберите все товары'}
          </button>
        )}
      </footer>

      {isArchivedView && list && (
        <RepeatListModal
          list={list}
          open={repeatOpen}
          loading={repeatBusy}
          onClose={() => !repeatBusy && setRepeatOpen(false)}
          onConfirm={handleRepeatConfirm}
        />
      )}
    </div>
  );
}
