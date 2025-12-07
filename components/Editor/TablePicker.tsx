import React, { useState } from 'react';
import { X } from 'lucide-react';

interface TablePickerProps {
  onSelect: (rows: number, cols: number) => void;
  onClose: () => void;
}

export const TablePicker: React.FC<TablePickerProps> = ({ onSelect, onClose }) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  return (
    <div 
      className="absolute top-full left-0 mt-2 bg-white border border-gray-300 shadow-2xl rounded-lg p-4 z-50 w-64 flex flex-col gap-4"
      onMouseDown={(e) => {
        // Stop bubbling so the global click listener in Toolbar doesn't close the picker
        e.stopPropagation();
      }}
    >
      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
        <h3 className="text-sm font-semibold text-gray-800">Insert Table</h3>
        <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
        >
           <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Rows</label>
          <input 
             type="number" 
             min="1" 
             max="50"
             className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
             value={rows}
             onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 0))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Columns</label>
          <input 
             type="number" 
             min="1" 
             max="12"
             className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
             value={cols}
             onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 0))}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(rows, cols)}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium py-2 rounded-md transition-colors shadow-sm flex items-center justify-center gap-2"
      >
        <span>Insert Table</span>
      </button>
    </div>
  );
};