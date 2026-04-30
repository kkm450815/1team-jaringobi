import { useCallback, useEffect, useState } from 'react';

const KEY = 'jaringobi.bookmarks.v1';

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function write(set: Set<string>) {
  localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
}

export function useBookmarks() {
  const [ids, setIds] = useState<Set<string>>(() => read());

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) setIds(read());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((postId: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      write(next);
      return next;
    });
  }, []);

  const has = useCallback((postId: string) => ids.has(postId), [ids]);

  return { ids, has, toggle };
}
