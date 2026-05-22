import { useState } from 'react';

export default function useViewMode(defaultMode = 'list') {
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem('fileViewMode') || defaultMode
  );

  const handleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('fileViewMode', mode);
  };

  return [viewMode, handleViewMode];
}