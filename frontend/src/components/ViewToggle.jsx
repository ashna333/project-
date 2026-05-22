import { Files, Layers } from 'lucide-react';

export default function ViewToggle({ viewMode, onChange }) {
  return (
    <div className="view-toggle-group">
      <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => onChange('list')}>
        <Files size={18} />
      </button>
      <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => onChange('grid')}>
        <Layers size={18} />
      </button>
    </div>
  );
}