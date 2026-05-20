import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchPrivateSharesInboxApi } from '../store/fileApi';

const InboxBadgeContext = createContext(false);

export function InboxBadgeProvider({ children }) {
  const [hasNew, setHasNew] = useState(false);

  const check = async () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) return; // skip if not logged in
    try {
      const { data } = await fetchPrivateSharesInboxApi();

      const list =
        data.results?.shares ??
        data.shares ??
        (Array.isArray(data.results) ? data.results : []);

      const lastSeen = localStorage.getItem('inbox_last_seen');

      const hasUnseen = lastSeen
        ? list.some(s => new Date(s.created_at) > new Date(lastSeen))
        : list.length > 0;

      setHasNew(hasUnseen);
    } catch {
      setHasNew(false);
    }
  };

  useEffect(() => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  if (!token) return;

  check();
  const interval = setInterval(check, 60_000);
  const onSeen = () => setHasNew(false);
  window.addEventListener('inbox-seen', onSeen);
  return () => {
    clearInterval(interval);
    window.removeEventListener('inbox-seen', onSeen);
  };
}, []);

  return (
    <InboxBadgeContext.Provider value={hasNew}>
      {children}
    </InboxBadgeContext.Provider>
  );
}

export const useInboxBadge = () => useContext(InboxBadgeContext);