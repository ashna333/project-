import { useEffect } from 'react';

/** Prevent background scroll while overlays/modals are open */
export default function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}
