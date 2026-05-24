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
    if (selectedIds.length === files.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(files.map(f => f.id));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectMode(false);
  };

  const allSelected = files.length > 0 && selectedIds.length === files.length;
  const someSelected = selectedIds.length > 0;

  return {
    selectMode, selectedIds,
    toggleSelectMode, toggleSelectFile,
    toggleSelectAll, clearSelection,
    allSelected, someSelected,
  };
}