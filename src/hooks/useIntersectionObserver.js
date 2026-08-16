import { useEffect, useRef, useState } from 'react';

export default function useIntersectionObserver({ threshold = 0, rootMargin = '200px', once = false } = {}) {
  const ref = useRef(null);
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([e]) => {
        setEntry(e);
        if (once && e.isIntersecting) observer.disconnect();
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold, rootMargin]);

  return [ref, entry];
}
