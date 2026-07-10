import { useEffect, useRef } from 'react';

/**
 * Держит fixed-шапку у верхнего края видимой области при открытии клавиатуры
 * (iOS/Android сдвигают layout viewport, и header с top:0 «уезжает» вверх).
 */
export function useVisualViewportFixedTop() {
  const ref = useRef(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    const node = ref.current;
    if (!viewport || !node) return undefined;

    const sync = () => {
      node.style.top = `${viewport.offsetTop}px`;
    };

    sync();
    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);

    return () => {
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
      node.style.top = '';
    };
  }, []);

  return ref;
}
