import React from 'react';
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ currentPage, totalPages, onPageChange, loading }) {
  // Don't render anything if there's only one page or if data is loading
  if (loading || totalPages <= 1) return null;

  return (
    <div className="pagination-wrapper">
      <div className="page-info">
        Page <span>{currentPage}</span> of <span>{totalPages}</span>
      </div>
      <div className="pagination-btns">
        <button 
          className={`p-btn ${currentPage === 1 ? 'disabled-btn' : 'active-btn'}`} 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 1}
        >
          <ChevronLeft size={18} /> Previous
        </button>
        <button 
          className={`p-btn ${currentPage === totalPages ? 'disabled-btn' : 'active-btn'}`} 
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage === totalPages}
        >
          Next <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}