import { useState } from 'react';

export default function useSelectMode(files) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelectMode = () => {
    setSelectMode(prev => !prev);
    setSelectedIds([]);
  };

  const toggleSelectFile = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const currentPageIds = files.map(f => f.id);
    const allCurrentPageSelected = currentPageIds.every(id => selectedIds.includes(id));

    if (allCurrentPageSelected) {
      // Deselect only current page, keep other pages' selections
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      // Add current page's IDs to existing selections
      setSelectedIds(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectMode(false);
  };

  // allSelected = every file on the current page is selected
  const allSelected = files.length > 0 && files.every(f => selectedIds.includes(f.id));
  const someSelected = selectedIds.length > 0;

  return {
    selectMode, selectedIds,
    toggleSelectMode, toggleSelectFile,
    toggleSelectAll, clearSelection,
    allSelected, someSelected,
  };
}