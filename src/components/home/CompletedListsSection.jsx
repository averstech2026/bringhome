import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  groupCompletedListsByDate,
  sortCompletedListsByDate,
} from '../../utils/groupCompletedLists';
import {
  BUILTIN_TYPES,
  getListTypeBadgeProps,
  getListTypeLabel,
  isBuiltinListType,
} from '../../utils/listTypes';
import { APP_BACKGROUND } from '../list/cardStyles';

function CompletedSectionDivider({ count }) {
  return (
    <div className={`flex items-center gap-3 ${APP_BACKGROUND}`}>
      <div className="h-px min-w-0 flex-1 bg-gray-200" />
      <span className="shrink-0 text-xs text-gray-400">
        — Готовые списки ({count}) —
      </span>
      <div className="h-px min-w-0 flex-1 bg-gray-200" />
    </div>
  );
}

const TYPE_COUNT_BADGE = {
  home: 'bg-emerald-50/40 text-emerald-600/80 border border-emerald-200/40',
  cottage: 'bg-amber-50/40 text-amber-600/80 border border-amber-200/40',
  trip: 'bg-sky-50/40 text-sky-600/80 border border-sky-200/40',
};

function TypeCountBadge({ type, count }) {
  const label = isBuiltinListType(type) ? BUILTIN_TYPES[type] : getListTypeLabel(type);
  const builtinClass = TYPE_COUNT_BADGE[type];
  const fallbackClass = getListTypeBadgeProps(type).className;

  return (
    <span
      className={`inline-flex min-w-[4.25rem] items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none ${
        builtinClass || `${fallbackClass} border border-current/15`
      }`}
    >
      {label} • {count}
    </span>
  );
}

function GroupDateTitle({ group }) {
  if (group.relativeLabel) {
    return (
      <div className="whitespace-nowrap text-left text-[11px] font-medium leading-tight text-slate-400">
        <span className="tabular-nums">{group.dateFull}</span>
        <span className="text-slate-400/80"> ({group.relativeLabel.toLowerCase()})</span>
      </div>
    );
  }

  return (
    <div className="whitespace-nowrap text-left text-[11px] font-medium tabular-nums leading-tight text-slate-400">
      {group.dateFull}
    </div>
  );
}

function CompletedDateGroup({ group, expanded, onToggle, renderListCard }) {
  return (
    <div className="my-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-x-3 rounded-lg border border-gray-200/50 bg-white px-3 py-2 text-left transition-all duration-200 hover:bg-slate-50"
      >
        <div className="shrink-0 text-left">
          <GroupDateTitle group={group} />
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-start gap-1.5">
          {group.typeCounts.map(([type, count]) => (
            <TypeCountBadge key={type} type={type} count={count} />
          ))}
        </div>

        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400/80 stroke-[1.5] transition-transform duration-300 ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          expanded ? 'mt-2 grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <ul className="space-y-2.5">
            {group.lists.map((list) => (
              <li key={list.id}>{renderListCard(list)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function CompletedListsGrouped({ lists, totalCount, renderListCard }) {
  const groups = groupCompletedListsByDate(lists);
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());

  const allExpanded = groups.length > 0 && groups.every((group) => expandedKeys.has(group.key));

  const toggleGroup = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllGroups = () => {
    if (allExpanded) {
      setExpandedKeys(new Set());
      return;
    }
    setExpandedKeys(new Set(groups.map((group) => group.key)));
  };

  return (
    <>
      <CompletedSectionDivider count={totalCount ?? lists.length} />

      {groups.length > 1 && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={toggleAllGroups}
            className="shrink-0 text-xs font-medium text-slate-500 transition-colors hover:text-slate-700 active:text-slate-800"
          >
            {allExpanded ? 'Свернуть все' : 'Развернуть все'}
          </button>
        </div>
      )}

      <div className="mt-3">
        {groups.map((group) => (
          <CompletedDateGroup
            key={group.key}
            group={group}
            expanded={expandedKeys.has(group.key)}
            onToggle={() => toggleGroup(group.key)}
            renderListCard={renderListCard}
          />
        ))}
      </div>
    </>
  );
}

function CompletedListsFlat({ lists, totalCount, renderListCard }) {
  const sorted = sortCompletedListsByDate(lists);

  return (
    <>
      <CompletedSectionDivider count={totalCount ?? lists.length} />
      <ul className="mt-3 space-y-2.5">
        {sorted.map((list) => (
          <li key={list.id}>{renderListCard(list)}</li>
        ))}
      </ul>
    </>
  );
}

export default function CompletedListsSection({
  lists,
  renderListCard,
  groupByDate = false,
  totalCount,
}) {
  if (lists.length === 0) return null;

  const dividerCount = totalCount ?? lists.length;

  return (
    <section className="mt-8">
      {groupByDate ? (
        <CompletedListsGrouped lists={lists} totalCount={dividerCount} renderListCard={renderListCard} />
      ) : (
        <CompletedListsFlat lists={lists} totalCount={dividerCount} renderListCard={renderListCard} />
      )}
    </section>
  );
}
