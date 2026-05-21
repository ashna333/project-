import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'none',
        border: 'none',
        color: '#71717a',
        fontSize: '13px',
        cursor: 'pointer',
        padding: '6px 0',
        marginBottom: '16px',
      }}
      onMouseEnter={e => e.currentTarget.style.color = '#e4e4e7'}
      onMouseLeave={e => e.currentTarget.style.color = '#71717a'}
    >
      <ChevronLeft size={18} /> Back
    </button>
  );
}