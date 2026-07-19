import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { CARD_SURFACE, CHIP_BUTTON } from '../components/list/cardStyles';
import {
  COPY_SECTIONS,
  KIND_LABELS,
  LIST_UI_COPY_ROWS,
  MATCH_LABELS,
  THEME_IDS,
  THEME_LABELS,
} from '../data/listUiCopyInventory';
import { getCopyRowExplain } from '../data/listUiCopyExplains';

const STORAGE_KEY = 'bringhome.listUiCopyDecisions.v2';

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'review', label: 'К ревизии' },
  { id: 'diff', label: 'Различается' },
  { id: 'analog', label: 'Аналоги' },
  { id: 'hide-same', label: 'Скрыть одинаково' },
  { id: 'selected', label: 'Выбрано' },
  { id: 'themes', label: 'Темы' },
  { id: 'ai', label: 'ИИ' },
  { id: 'non-ai', label: 'Не ИИ' },
  { id: 'buttons', label: 'Кнопки' },
  { id: 'modals', label: 'Модалки' },
  { id: 'toasts', label: 'Сообщения' },
];

const MATCH_STYLES = {
  same: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  analog: 'bg-sky-50 text-sky-700 ring-sky-200',
  diff: 'bg-amber-50 text-amber-800 ring-amber-200',
  'shopping-only': 'bg-violet-50 text-violet-700 ring-violet-200',
  'packing-only': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
};

const THEME_CHIP = {
  default: 'bg-violet-50 text-violet-800 ring-violet-200',
  hogwarts: 'bg-red-50 text-red-900 ring-red-200',
  star_wars: 'bg-slate-100 text-indigo-900 ring-indigo-200',
  paddington: 'bg-blue-50 text-blue-950 ring-blue-200',
};

/** @typedef {'shopping' | 'packing' | 'custom' | 'keep' | 'default' | 'hogwarts' | 'star_wars' | 'paddington'} TargetKind */

/**
 * @typedef {{
 *   selected: boolean,
 *   target: TargetKind,
 *   customText: string,
 * }} Decision
 */

/** @returns {Record<string, Decision>} */
function loadDecisions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, Decision>} decisions */
function saveDecisions(decisions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
  } catch {
    /* ignore quota */
  }
}

function emptyDecision() {
  return { selected: false, target: /** @type {TargetKind} */ ('keep'), customText: '' };
}

function isThemedRow(row) {
  return Boolean(row.themed && row.variants);
}

function matchPassesFilter(row, filterId, decision) {
  if (filterId === 'all') return true;
  if (filterId === 'review') return row.match === 'diff' || Boolean(row.note);
  if (filterId === 'diff') return row.match === 'diff';
  if (filterId === 'analog') return row.match === 'analog';
  if (filterId === 'hide-same') return row.match !== 'same';
  if (filterId === 'selected') return Boolean(decision?.selected);
  if (filterId === 'themes') return Boolean(row.themed);
  if (filterId === 'ai') return Boolean(row.ai);
  if (filterId === 'non-ai') return !row.ai;
  if (filterId === 'buttons') return row.kind === 'button';
  if (filterId === 'modals') return row.kind === 'modal';
  if (filterId === 'toasts') return row.kind === 'toast' || row.kind === 'empty';
  return true;
}

function resolveTargetLabel(row, decision) {
  if (!decision?.selected) return null;
  if (decision.target === 'shopping') return row.shopping || '(нет у покупок)';
  if (decision.target === 'packing') return row.packing || '(нет у сборов)';
  if (THEME_IDS.includes(decision.target)) {
    const v = row.variants?.[decision.target];
    return v?.text || `(нет у темы ${THEME_LABELS[decision.target]})`;
  }
  if (decision.target === 'custom') return decision.customText.trim() || '(введите текст)';
  return isThemedRow(row)
    ? 'оставить тематические формулировки'
    : 'оставить как есть (разные формулировки)';
}

function Cell({ value, side, active }) {
  if (!value) {
    return (
      <p className="text-[13px] italic text-slate-300">
        — нет у {side === 'shopping' ? 'покупок' : 'сборов'}
      </p>
    );
  }
  return (
    <p
      className={`whitespace-pre-wrap text-[13px] leading-snug ${
        active ? 'font-semibold text-slate-900' : 'text-slate-800'
      }`}
    >
      {value}
    </p>
  );
}

function TargetOption({ name, value, checked, onChange, label, hint, disabled }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-xl border px-2.5 py-2 transition ${
        checked
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 accent-white"
      />
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold leading-tight">{label}</span>
        {hint ? (
          <span className={`mt-0.5 block text-[11px] leading-snug ${checked ? 'text-white/70' : 'text-slate-400'}`}>
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function ThemeVariantsGrid({ variants, selectedTheme, onPick }) {
  return (
    <div className="grid grid-cols-1 gap-0 divide-y divide-slate-100">
      {THEME_IDS.map((themeId) => {
        const text = variants?.[themeId]?.text;
        const active = selectedTheme === themeId;
        return (
          <button
            key={themeId}
            type="button"
            onClick={() => onPick?.(themeId)}
            className={`px-3 py-2.5 text-left transition ${
              active ? 'bg-slate-100' : 'hover:bg-slate-50'
            }`}
          >
            <p className="mb-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${THEME_CHIP[themeId]}`}
              >
                {THEME_LABELS[themeId]}
              </span>
              {active ? (
                <span className="text-[10px] font-medium text-slate-500">· цель</span>
              ) : null}
            </p>
            <p className="whitespace-pre-wrap text-[13px] leading-snug text-slate-800">
              {text || '—'}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function CopyRowCard({ row, decision, onChange }) {
  const selected = Boolean(decision.selected);
  const target = decision.target || 'keep';
  const themed = isThemedRow(row);
  const explain = getCopyRowExplain(row);

  const setSelected = (next) => {
    onChange({
      ...decision,
      selected: next,
      target:
        next && decision.target === 'keep' && row.match === 'diff'
          ? themed
            ? 'keep'
            : row.shopping
              ? 'shopping'
              : row.packing
                ? 'packing'
                : 'custom'
          : decision.target || 'keep',
    });
  };

  const setTarget = (nextTarget) => {
    onChange({
      ...decision,
      selected: true,
      target: nextTarget,
    });
  };

  return (
    <article
      className={`${CARD_SURFACE} overflow-hidden ${
        selected ? 'ring-2 ring-slate-900/15' : ''
      }`}
    >
      <div className="flex items-start gap-3 border-b border-slate-100 px-3 py-2.5">
        <label className="mt-0.5 flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => setSelected(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 accent-slate-900"
            aria-label={`Исправить: ${row.role}`}
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-slate-900">{row.role}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {KIND_LABELS[row.kind] || row.kind}
            {row.sources?.length ? ` · ${row.sources.join(', ')}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {themed ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
              Темы
            </span>
          ) : null}
          {row.ai ? (
            <span className="rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-700 ring-1 ring-fuchsia-200">
              ИИ
            </span>
          ) : (
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
              Не ИИ
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${MATCH_STYLES[row.match]}`}
          >
            {MATCH_LABELS[row.match]}
          </span>
        </div>
      </div>

      {explain ? (
        <p className="border-b border-sky-100 bg-sky-50/70 px-3 py-2.5 text-[13px] leading-snug text-slate-700">
          {explain}
        </p>
      ) : null}

      {themed ? (
        <ThemeVariantsGrid
          variants={row.variants}
          selectedTheme={THEME_IDS.includes(target) ? target : null}
          onPick={setTarget}
        />
      ) : (
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
          <button
            type="button"
            disabled={!row.shopping}
            onClick={() => setTarget('shopping')}
            className={`border-b border-slate-100 px-3 py-2.5 text-left transition sm:border-b-0 sm:border-r disabled:cursor-default ${
              selected && target === 'shopping'
                ? 'bg-emerald-50'
                : 'hover:bg-slate-50 disabled:hover:bg-transparent'
            }`}
          >
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
              Покупки
              {selected && target === 'shopping' ? ' · цель' : ''}
            </p>
            <Cell value={row.shopping} side="shopping" active={selected && target === 'shopping'} />
          </button>
          <button
            type="button"
            disabled={!row.packing}
            onClick={() => setTarget('packing')}
            className={`px-3 py-2.5 text-left transition disabled:cursor-default ${
              selected && target === 'packing'
                ? 'bg-indigo-50'
                : 'hover:bg-slate-50 disabled:hover:bg-transparent'
            }`}
          >
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
              Сборы
              {selected && target === 'packing' ? ' · цель' : ''}
            </p>
            <Cell value={row.packing} side="packing" active={selected && target === 'packing'} />
          </button>
        </div>
      )}

      {row.note && row.note !== explain ? (
        <p className="border-t border-amber-100 bg-amber-50/60 px-3 py-2 text-[12px] leading-snug text-amber-900">
          {row.note}
        </p>
      ) : null}

      {selected ? (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/80 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Привести к виду
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {themed ? (
              <>
                {THEME_IDS.map((themeId) => (
                  <TargetOption
                    key={themeId}
                    name={`target-${row.id}`}
                    value={themeId}
                    checked={target === themeId}
                    onChange={() => setTarget(themeId)}
                    label={`Как у «${THEME_LABELS[themeId]}»`}
                    hint={truncate(row.variants?.[themeId]?.text || '—', 70)}
                  />
                ))}
                <TargetOption
                  name={`target-${row.id}`}
                  value="custom"
                  checked={target === 'custom'}
                  onChange={() => setTarget('custom')}
                  label="Свой текст"
                  hint="Единая формулировка для всех тем"
                />
                <TargetOption
                  name={`target-${row.id}`}
                  value="keep"
                  checked={target === 'keep'}
                  onChange={() => setTarget('keep')}
                  label="Оставить тематическими"
                  hint="Не унифицировать между темами"
                />
              </>
            ) : (
              <>
                <TargetOption
                  name={`target-${row.id}`}
                  value="shopping"
                  checked={target === 'shopping'}
                  disabled={!row.shopping}
                  onChange={() => setTarget('shopping')}
                  label="Как у покупок"
                  hint={row.shopping ? truncate(row.shopping, 60) : 'Нет варианта'}
                />
                <TargetOption
                  name={`target-${row.id}`}
                  value="packing"
                  checked={target === 'packing'}
                  disabled={!row.packing}
                  onChange={() => setTarget('packing')}
                  label="Как у сборов"
                  hint={row.packing ? truncate(row.packing, 60) : 'Нет варианта'}
                />
                <TargetOption
                  name={`target-${row.id}`}
                  value="custom"
                  checked={target === 'custom'}
                  onChange={() => setTarget('custom')}
                  label="Свой текст"
                  hint="Единая формулировка для обоих"
                />
                <TargetOption
                  name={`target-${row.id}`}
                  value="keep"
                  checked={target === 'keep'}
                  onChange={() => setTarget('keep')}
                  label="Оставить разными"
                  hint="Не унифицировать"
                />
              </>
            )}
          </div>
          {target === 'custom' ? (
            <textarea
              value={decision.customText}
              onChange={(e) => onChange({ ...decision, customText: e.target.value })}
              rows={2}
              placeholder={
                themed
                  ? 'Итоговая надпись для всех тем…'
                  : 'Итоговая надпись для обоих списков…'
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
            />
          ) : null}
          <p className="text-[12px] text-slate-600">
            <span className="font-medium text-slate-800">Итог: </span>
            {resolveTargetLabel(row, decision)}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function truncate(text, max) {
  const value = String(text || '');
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function buildPlanMarkdown(decisions) {
  const lines = [
    '# План правок копирайта: покупки ↔ сборы (+ UI-темы)',
    '',
    `Дата: ${new Date().toLocaleString('ru-RU')}`,
    '',
  ];

  const selected = LIST_UI_COPY_ROWS.filter((row) => decisions[row.id]?.selected);
  if (selected.length === 0) {
    lines.push('_Ничего не выбрано._');
    return lines.join('\n');
  }

  let section = '';
  for (const row of selected) {
    if (row.section !== section) {
      section = row.section;
      lines.push(`## ${section}`, '');
    }
    const d = decisions[row.id];
    const targetLabel = THEME_IDS.includes(d.target)
      ? `как у темы «${THEME_LABELS[d.target]}»`
      : d.target === 'shopping'
        ? 'как у покупок'
        : d.target === 'packing'
          ? 'как у сборов'
          : d.target === 'custom'
            ? 'свой текст'
            : isThemedRow(row)
              ? 'оставить тематическими'
              : 'оставить разными';

    lines.push(`### ${row.role}`);
    if (isThemedRow(row)) {
      for (const themeId of THEME_IDS) {
        lines.push(`- ${THEME_LABELS[themeId]}: ${row.variants?.[themeId]?.text ?? '—'}`);
      }
    } else {
      lines.push(`- Сейчас покупки: ${row.shopping ?? '—'}`);
      lines.push(`- Сейчас сборы: ${row.packing ?? '—'}`);
    }
    lines.push(`- Решение: **${targetLabel}**`);
    lines.push(`- Итог: ${resolveTargetLabel(row, d)}`);
    const explain = getCopyRowExplain(row);
    if (explain) lines.push(`- Пояснение: ${explain}`);
    if (row.sources?.length) lines.push(`- Файлы: ${row.sources.join(', ')}`);
    if (row.note && row.note !== explain) lines.push(`- Заметка: ${row.note}`);
    lines.push('');
  }
  return lines.join('\n');
}

export default function ListUiCopyAuditPage() {
  const [filter, setFilter] = useState('all');
  const [section, setSection] = useState('all');
  const [decisions, setDecisions] = useState(loadDecisions);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    saveDecisions(decisions);
  }, [decisions]);

  const updateDecision = (id, next) => {
    setDecisions((prev) => ({ ...prev, [id]: next }));
  };

  const filtered = useMemo(() => {
    return LIST_UI_COPY_ROWS.filter((row) => {
      if (section !== 'all' && row.section !== section) return false;
      return matchPassesFilter(row, filter, decisions[row.id]);
    });
  }, [filter, section, decisions]);

  const bySection = useMemo(() => {
    const map = new Map();
    for (const row of filtered) {
      if (!map.has(row.section)) map.set(row.section, []);
      map.get(row.section).push(row);
    }
    return map;
  }, [filtered]);

  const stats = useMemo(() => {
    const all = LIST_UI_COPY_ROWS;
    const selectedRows = all.filter((r) => decisions[r.id]?.selected);
    const diff = all.filter((r) => r.match === 'diff').length;
    const analog = all.filter((r) => r.match === 'analog').length;
    const same = all.filter((r) => r.match === 'same').length;
    return {
      total: all.length,
      themed: all.filter((r) => r.themed).length,
      ai: all.filter((r) => r.ai).length,
      diff,
      analog,
      hideSame: all.length - same,
      selected: selectedRows.length,
      withCustom: selectedRows.filter((r) => decisions[r.id]?.target === 'custom').length,
    };
  }, [decisions]);

  const selectVisible = (value) => {
    setDecisions((prev) => {
      const next = { ...prev };
      for (const row of filtered) {
        const current = next[row.id] || emptyDecision();
        next[row.id] = {
          ...current,
          selected: value,
          target:
            value && current.target === 'keep' && row.match === 'diff' && !isThemedRow(row)
              ? row.shopping
                ? 'shopping'
                : row.packing
                  ? 'packing'
                  : 'custom'
              : current.target || 'keep',
        };
      }
      return next;
    });
  };

  const clearAll = () => {
    setDecisions({});
  };

  const copyPlan = async () => {
    const text = buildPlanMarkdown(decisions);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex min-h-full flex-col px-4 pb-28">
      <PageHeader title="Ревизия копирайта" backTo="/settings" />

      <div className="mt-3 space-y-3">
        <section className={`${CARD_SURFACE} px-3 py-3`}>
          <h2 className="text-[15px] font-semibold text-slate-900">
            Покупки ↔ Сборы · UI-темы
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            Сверка надписей двух типов списков и всех тематических формулировок
            (Обычная, Хогвартс, Джедай, Паддингтон). В каждой карточке сверху —
            пояснение, что это за надпись и чем отличаются покупки и сборы.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            {[
              ['Всего', stats.total],
              ['Темы', stats.themed],
              ['Выбрано', stats.selected],
              ['ИИ', stats.ai],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 px-2 py-2">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {label}
                </dt>
                <dd className="text-lg font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-1.5 pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`${CHIP_BUTTON} ${
                  filter === f.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {f.label}
                {f.id === 'diff' ? ` (${stats.diff})` : ''}
                {f.id === 'analog' ? ` (${stats.analog})` : ''}
                {f.id === 'hide-same' ? ` (${stats.hideSame})` : ''}
                {f.id === 'selected' && stats.selected > 0 ? ` (${stats.selected})` : ''}
                {f.id === 'themes' ? ` (${stats.themed})` : ''}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Раздел
          </span>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400"
          >
            <option value="all">Все разделы</option>
            {COPY_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="text-slate-400">
            Показано {filtered.length} из {stats.total}
          </span>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={() => selectVisible(true)}
            className="font-medium text-slate-600 underline-offset-2 hover:underline"
          >
            Выбрать видимые
          </button>
          <button
            type="button"
            onClick={() => selectVisible(false)}
            className="font-medium text-slate-600 underline-offset-2 hover:underline"
          >
            Снять видимые
          </button>
        </div>

        {[...bySection.entries()].map(([sectionName, rows]) => (
          <section key={sectionName} className="space-y-2">
            <h3 className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-10 -mx-1 bg-[#f5f5f7]/95 px-1 py-1.5 text-[13px] font-semibold text-slate-700 backdrop-blur-sm">
              {sectionName}
              <span className="ml-1.5 font-normal text-slate-400">({rows.length})</span>
            </h3>
            {rows.map((row) => (
              <CopyRowCard
                key={row.id}
                row={row}
                decision={decisions[row.id] || emptyDecision()}
                onChange={(next) => updateDecision(row.id, next)}
              />
            ))}
          </section>
        ))}

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Нет строк по выбранным фильтрам
          </p>
        ) : null}

        <p className="pt-2 text-center text-[11px] text-slate-400">
          Данные: <code className="text-slate-500">src/data/listUiCopyInventory.js</code>
          {' · '}
          <Link to="/settings" className="text-slate-500 underline-offset-2 hover:underline">
            Настройки
          </Link>
        </p>
      </div>

      {stats.selected > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-[13px] text-slate-700">
              <span className="font-semibold text-slate-900">{stats.selected}</span>
              {' '}к правке
              {stats.withCustom > 0 ? ` · ${stats.withCustom} свой текст` : ''}
            </p>
            <button
              type="button"
              onClick={copyPlan}
              className="rounded-full bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white"
            >
              {copied ? 'Скопировано' : 'Скопировать план'}
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-600"
            >
              Сбросить
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
