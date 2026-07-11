import { useEffect, useState } from 'react';

/** Отслеживает высоту элемента (ResizeObserver + resize окна). */
export function useElementHeight(ref, active = true) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!active) {
      setHeight(0);
      return undefined;
    }

    const measure = () => {
      const node = ref.current;
      if (!node) return;
      setHeight(Math.ceil(node.getBoundingClientRect().height));
    };

    const frame = requestAnimationFrame(measure);

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measure)
      : null;
    const node = ref.current;
    if (node) observer?.observe(node);
    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ref, active]);

  return height;
}
