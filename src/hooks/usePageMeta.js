import { useEffect } from 'react';

export default function usePageMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} | Kayad` : 'Kayad — Kenya\'s Premium Car Marketplace';

    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute('content');
    if (meta && description) meta.setAttribute('content', description);

    return () => {
      document.title = prevTitle;
      if (meta && prevDesc) meta.setAttribute('content', prevDesc);
    };
  }, [title, description]);
}
