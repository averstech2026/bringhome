import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  HOME_DESKTOP_COUNT,
  HOME_DESKTOP_OPTIONS,
  HOME_DESKTOP_PEEK_PX,
} from '../../utils/homeDesktops';
import { DESKTOP_DOT_ACTIVE } from '../../utils/contextAccents';

/** Запас снизу под FAB / safe-area, чтобы жест не упирался в кнопку «+». */
const BOTTOM_RESERVE_PX = 96;
/** Минимальный горизонтальный сдвиг для перехода «по кругу» на краю. */
const EDGE_WRAP_PX = 48;

function clampDesktopIndex(index) {
  return Math.min(Math.max(index, 0), HOME_DESKTOP_COUNT - 1);
}

function wrapDesktopIndex(index) {
  if (HOME_DESKTOP_COUNT <= 0) return 0;
  return ((index % HOME_DESKTOP_COUNT) + HOME_DESKTOP_COUNT) % HOME_DESKTOP_COUNT;
}

function getPaneWidth(container) {
  if (!container) return 0;
  return Math.max(container.clientWidth - HOME_DESKTOP_PEEK_PX, 0);
}

/**
 * Горизонтальный пейджер рабочих столов с edge-peek и точками-индикатором.
 * На краях свайп «за край» перелистывает по кругу (покупки ↔ сборы).
 */
export default function HomeDesktopPager({
  initialIndex = 0,
  onIndexChange,
  children,
}) {
  const panes = Children.toArray(children);
  const scrollRef = useRef(null);
  const paneRefs = useRef([]);
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;

  const touchStartRef = useRef({ x: 0, y: 0, scrollLeft: 0 });
  const ignoreScrollEmitUntilRef = useRef(0);

  const [activeIndex, setActiveIndex] = useState(() => clampDesktopIndex(initialIndex));
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const syncHeight = useCallback(() => {
    const container = scrollRef.current;
    const pane = paneRefs.current[activeIndexRef.current];
    if (!container || !pane) return;

    // Сброс, чтобы измерить натуральную высоту контента без растяжения.
    container.style.height = 'auto';
    paneRefs.current.forEach((node) => {
      if (node) node.style.minHeight = '';
    });

    const contentHeight = pane.scrollHeight;
    const top = container.getBoundingClientRect().top;
    const viewportFloor = Math.max(window.innerHeight - top - BOTTOM_RESERVE_PX, 0);
    const height = Math.max(contentHeight, viewportFloor);

    container.style.height = `${height}px`;
    // Все панели тянем на высоту области свайпа — жест ловится и по «пустому» фону.
    paneRefs.current.forEach((node) => {
      if (node) node.style.minHeight = `${height}px`;
    });
  }, []);

  const emitIndex = useCallback((index) => {
    const nextIndex = clampDesktopIndex(index);
    if (nextIndex === activeIndexRef.current) return;
    setActiveIndex(nextIndex);
    activeIndexRef.current = nextIndex;
    onIndexChangeRef.current?.(nextIndex);
  }, []);

  const scrollToIndex = useCallback((index, behavior = 'smooth') => {
    const container = scrollRef.current;
    if (!container) return;
    const nextIndex = wrapDesktopIndex(index);
    const paneWidth = getPaneWidth(container);
    if (behavior === 'smooth') {
      ignoreScrollEmitUntilRef.current = Date.now() + 420;
    }
    container.scrollTo({ left: nextIndex * paneWidth, behavior });
    setActiveIndex(nextIndex);
    activeIndexRef.current = nextIndex;
    onIndexChangeRef.current?.(nextIndex);
  }, []);

  useLayoutEffect(() => {
    scrollToIndex(initialIndex, 'instant');
  }, [initialIndex, scrollToIndex]);

  useLayoutEffect(() => {
    syncHeight();
  }, [activeIndex, syncHeight]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return undefined;

    const onViewportChange = () => {
      const paneWidth = getPaneWidth(container);
      container.scrollTo({
        left: activeIndexRef.current * paneWidth,
        behavior: 'instant',
      });
      syncHeight();
    };

    window.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('resize', onViewportChange);

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(onViewportChange);
      observer.observe(container);
      paneRefs.current.forEach((pane) => {
        if (pane) observer.observe(pane);
      });
    }

    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('resize', onViewportChange);
      observer?.disconnect();
    };
  }, [panes.length, syncHeight]);

  const updateActiveFromScroll = useCallback(() => {
    if (Date.now() < ignoreScrollEmitUntilRef.current) return;
    const container = scrollRef.current;
    if (!container) return;
    const paneWidth = getPaneWidth(container) || 1;
    const index = Math.round(container.scrollLeft / paneWidth);
    emitIndex(index);
  }, [emitIndex]);

  const handlePointerDown = useCallback((event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const container = scrollRef.current;
    touchStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: container?.scrollLeft ?? 0,
    };
  }, []);

  const handlePointerUp = useCallback((event) => {
    if (HOME_DESKTOP_COUNT < 2) return;

    const start = touchStartRef.current;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    // Только явный горизонтальный жест.
    if (Math.abs(dx) < EDGE_WRAP_PX || Math.abs(dx) <= Math.abs(dy)) return;

    const container = scrollRef.current;
    if (!container) return;

    // Если нативный скролл уже перелистнул стол — не вмешиваемся.
    const scrollDelta = Math.abs(container.scrollLeft - start.scrollLeft);
    if (scrollDelta > 12) return;

    const paneWidth = getPaneWidth(container) || 1;
    const maxScroll = Math.max((HOME_DESKTOP_COUNT - 1) * paneWidth, 0);
    const scrollLeft = container.scrollLeft;
    const index = activeIndexRef.current;

    // Палец вправо на первом столе → предыдущий по кругу (последний).
    if (index === 0 && dx > EDGE_WRAP_PX && scrollLeft <= 2) {
      scrollToIndex(HOME_DESKTOP_COUNT - 1);
      return;
    }

    // Палец влево на последнем столе → следующий по кругу (первый).
    if (index === HOME_DESKTOP_COUNT - 1 && dx < -EDGE_WRAP_PX && scrollLeft >= maxScroll - 2) {
      scrollToIndex(0);
    }
  }, [scrollToIndex]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="mt-2 flex shrink-0 justify-center gap-1.5"
        role="tablist"
        aria-label="Рабочие столы"
      >
        {HOME_DESKTOP_OPTIONS.map((desktop, index) => (
          <button
            key={desktop.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={desktop.label}
            aria-current={index === activeIndex ? 'page' : undefined}
            onClick={() => scrollToIndex(index)}
            className={`h-1.5 rounded-full transition-all ${
              index === activeIndex
                ? `w-5 ${DESKTOP_DOT_ACTIVE[desktop.id] || 'bg-emerald-500'}`
                : 'w-1.5 bg-slate-200'
            }`}
          />
        ))}
      </div>

      <div
        ref={scrollRef}
        onScroll={updateActiveFromScroll}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="-mx-4 mt-2 flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain transition-[height] duration-200 ease-out no-scrollbar touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {panes.map((pane, index) => (
          <div
            key={HOME_DESKTOP_OPTIONS[index]?.id ?? index}
            ref={(node) => {
              paneRefs.current[index] = node;
            }}
            role="tabpanel"
            aria-label={HOME_DESKTOP_OPTIONS[index]?.label}
            aria-hidden={index !== activeIndex}
            className="shrink-0 snap-start self-stretch px-4"
            style={{ width: `calc(100% - ${HOME_DESKTOP_PEEK_PX}px)` }}
          >
            {pane}
          </div>
        ))}
      </div>
    </div>
  );
}
