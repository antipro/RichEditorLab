import React, { useEffect, useState } from 'react';
import { Copy, Scissors, Clipboard, CheckSquare, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Table, Trash, Merge, Split, Palette } from 'lucide-react';

interface TextContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  editorRef: React.RefObject<HTMLDivElement>;
  tableTarget: HTMLElement | null;
}

export const TextContextMenu: React.FC<TextContextMenuProps> = ({ position, onClose, editorRef, tableTarget }) => {
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedCellsCount, setSelectedCellsCount] = useState(0);
  const [canSplit, setCanSplit] = useState(false);

  useEffect(() => {
    const selection = window.getSelection();
    setHasSelection(!!selection && !selection.isCollapsed);
    
    if (editorRef.current) {
        const selected = editorRef.current.querySelectorAll('.selected-cell');
        const count = selected.length;
        setSelectedCellsCount(count);

        // Check if we can split (single selected cell with colspan > 1)
        if (count === 1) {
            const cell = selected[0] as HTMLElement;
            const colspan = parseInt(cell.getAttribute('colspan') || '1');
            setCanSplit(colspan > 1);
        } else if (count === 0 && tableTarget) {
            // Or right clicked on a merged cell without selecting it (implicitly selected)
             const colspan = parseInt(tableTarget.getAttribute('colspan') || '1');
             setCanSplit(colspan > 1);
        } else {
            setCanSplit(false);
        }
    }
  }, [editorRef, tableTarget]);

  const notifyChange = () => {
      if (editorRef.current) {
          editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
      }
      onClose();
  };

  // --- Clipboard Actions ---
  const handleCopy = () => {
    document.execCommand('copy');
    onClose();
  };
  const handleCut = () => {
    document.execCommand('cut');
    onClose();
  };
  const handlePaste = async () => {
    onClose(); 
    try {
        if (editorRef.current) editorRef.current.focus();
        const text = await navigator.clipboard.readText();
        if (text) document.execCommand('insertText', false, text);
    } catch (err) {
        alert('Paste failed. Please use Ctrl+V.');
    }
  };
  const handleSelectAll = () => {
      if (editorRef.current) {
          editorRef.current.focus();
          document.execCommand('selectAll');
      }
      onClose();
  };

  // --- Table Actions ---

  const getTargetTable = () => tableTarget?.closest('table');
  const getTargetRow = () => tableTarget?.closest('tr');

  const insertRow = (before: boolean) => {
      const row = getTargetRow();
      const tbody = row?.parentElement;
      if (!row || !tbody) return;

      const newRow = row.cloneNode(true) as HTMLTableRowElement;
      Array.from(newRow.children).forEach(child => {
          child.innerHTML = '<br>'; 
          if (child instanceof HTMLElement) child.classList.remove('selected-cell');
          // Reset merged attributes for new row
          child.removeAttribute('colspan');
          child.removeAttribute('rowspan');
      });

      if (before) tbody.insertBefore(newRow, row);
      else tbody.insertBefore(newRow, row.nextSibling);
      notifyChange();
  };

  const insertCol = (before: boolean) => {
      const cell = tableTarget;
      const row = getTargetRow();
      const table = getTargetTable();
      if (!cell || !row || !table) return;

      const cellIndex = Array.from(row.children).indexOf(cell);
      
      Array.from(table.rows).forEach(tr => {
          if (tr.children.length <= cellIndex) return;
          const ref = tr.children[cellIndex];
          const newCell = document.createElement(ref.tagName);
          newCell.className = ref.className;
          newCell.innerHTML = '<br>';
          newCell.style.cssText = (ref as HTMLElement).style.cssText;
          newCell.classList.remove('selected-cell');
          newCell.removeAttribute('colspan');
          newCell.removeAttribute('rowspan');

          if (before) tr.insertBefore(newCell, ref);
          else tr.insertBefore(newCell, ref.nextSibling);
      });
      notifyChange();
  };

  const deleteRow = () => {
      const row = getTargetRow();
      if (row) {
          row.remove();
          notifyChange();
      }
  };

  const deleteCol = () => {
      const cell = tableTarget;
      const row = getTargetRow();
      const table = getTargetTable();
      if (!cell || !row || !table) return;

      const cellIndex = Array.from(row.children).indexOf(cell);
      Array.from(table.rows).forEach(tr => {
          if (tr.children[cellIndex]) {
              tr.children[cellIndex].remove();
          }
      });
      notifyChange();
  };

  const handleMerge = () => {
      if (!editorRef.current) return;
      const selected = Array.from(editorRef.current.querySelectorAll('.selected-cell')) as HTMLElement[];
      if (selected.length < 2) return;

      // Find bounds
      let minRow = Infinity, maxRow = -Infinity;
      let minCol = Infinity, maxCol = -Infinity;
      
      const cellsWithPos = selected.map(cell => {
          const r = cell.closest('tr');
          const t = r?.closest('table');
          if (!r || !t) return null;
          return {
              cell,
              rowIdx: Array.from(t.rows).indexOf(r),
              colIdx: Array.from(r.children).indexOf(cell)
          };
      }).filter(Boolean) as { cell: HTMLElement, rowIdx: number, colIdx: number }[];

      if (cellsWithPos.length === 0) return;

      cellsWithPos.forEach(p => {
          minRow = Math.min(minRow, p.rowIdx);
          maxRow = Math.max(maxRow, p.rowIdx);
          minCol = Math.min(minCol, p.colIdx);
          maxCol = Math.max(maxCol, p.colIdx);
      });

      // Valid rectangle check (simplified - works for simple grids)
      // Note: This naive index check assumes no prior complex merges on the left of selection
      // but works well for basic merging needs.
      const rowSpan = maxRow - minRow + 1;
      const colSpan = maxCol - minCol + 1;
      
      // Use the top-left cell as the anchor
      const anchor = cellsWithPos.find(p => p.rowIdx === minRow && p.colIdx === minCol)?.cell;
      if (!anchor) return;

      if (colSpan > 1) anchor.setAttribute('colspan', String(colSpan));
      if (rowSpan > 1) anchor.setAttribute('rowspan', String(rowSpan));
      
      // Remove other cells
      selected.forEach(cell => {
          if (cell !== anchor) {
              // Optional: Move content to anchor
              if (cell.textContent?.trim()) {
                   anchor.innerHTML += ' ' + cell.innerHTML;
              }
              cell.remove();
          }
      });
      
      anchor.classList.remove('selected-cell');
      notifyChange();
  };

  const handleSplit = () => {
      // Split horizontally merged cell
      const cell = tableTarget || (editorRef.current?.querySelector('.selected-cell') as HTMLElement);
      if (!cell) return;
      
      const colspan = parseInt(cell.getAttribute('colspan') || '1');
      if (colspan <= 1) return;
      
      // 1. Reset colspan
      cell.removeAttribute('colspan');
      
      // 2. Insert (colspan - 1) new cells after current cell
      const parent = cell.parentNode;
      if (parent) {
          for (let i = 0; i < colspan - 1; i++) {
              const newCell = cell.cloneNode(false) as HTMLElement;
              newCell.innerHTML = '<br>';
              newCell.classList.remove('selected-cell');
              newCell.removeAttribute('colspan');
              newCell.removeAttribute('rowspan');
              // Insert after current cell (or previous inserted new cell)
              if (cell.nextSibling) {
                  parent.insertBefore(newCell, cell.nextSibling);
              } else {
                  parent.appendChild(newCell);
              }
          }
      }
      notifyChange();
  };

  const setCellBackground = (color: string) => {
      if (editorRef.current) {
          const selected = editorRef.current.querySelectorAll('.selected-cell');
          if (selected.length > 0) {
              selected.forEach(cell => (cell as HTMLElement).style.backgroundColor = color);
          } else if (tableTarget) {
              tableTarget.style.backgroundColor = color;
          }
          notifyChange();
      }
  };

  return (
    <div 
      className="fixed z-50 bg-white border border-gray-200 shadow-2xl rounded-lg py-1 w-60 text-sm select-none"
      style={{ 
          top: Math.min(window.innerHeight - (tableTarget ? 500 : 200), position.y), 
          left: Math.min(window.innerWidth - 240, position.x) 
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {!tableTarget && (
        <>
            <button onClick={handleCopy} disabled={!hasSelection} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 text-gray-700">
                <Copy className="w-4 h-4" /> Copy
            </button>
            <button onClick={handleCut} disabled={!hasSelection} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 text-gray-700">
                <Scissors className="w-4 h-4" /> Cut
            </button>
            <button onClick={handlePaste} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700">
                <Clipboard className="w-4 h-4" /> Paste
            </button>
            <div className="h-px bg-gray-200 my-1"></div>
            <button onClick={handleSelectAll} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700">
                <CheckSquare className="w-4 h-4" /> Select All
            </button>
        </>
      )}

      {tableTarget && (
        <>
           <div className="px-3 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 bg-gray-50 border-b border-gray-100">
             <Table className="w-3 h-3" /> Table Options
           </div>
           
           {/* Row/Col Management */}
           <div className="grid grid-cols-2 gap-0.5 p-1">
                <button onClick={() => insertCol(true)} className="p-1.5 hover:bg-blue-50 text-gray-700 rounded flex flex-col items-center justify-center text-xs gap-1" title="Add Col Left">
                    <ArrowLeft className="w-4 h-4" /> +Col Left
                </button>
                <button onClick={() => insertCol(false)} className="p-1.5 hover:bg-blue-50 text-gray-700 rounded flex flex-col items-center justify-center text-xs gap-1" title="Add Col Right">
                    <ArrowRight className="w-4 h-4" /> +Col Right
                </button>
                <button onClick={() => insertRow(true)} className="p-1.5 hover:bg-blue-50 text-gray-700 rounded flex flex-col items-center justify-center text-xs gap-1" title="Add Row Above">
                    <ArrowUp className="w-4 h-4" /> +Row Up
                </button>
                <button onClick={() => insertRow(false)} className="p-1.5 hover:bg-blue-50 text-gray-700 rounded flex flex-col items-center justify-center text-xs gap-1" title="Add Row Below">
                    <ArrowDown className="w-4 h-4" /> +Row Down
                </button>
           </div>
           
           <div className="h-px bg-gray-200 my-1"></div>
           
           {/* Deletion */}
           <button onClick={deleteRow} className="w-full text-left px-4 py-1.5 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 text-gray-700">
             <Trash className="w-4 h-4" /> Delete Row
           </button>
           <button onClick={deleteCol} className="w-full text-left px-4 py-1.5 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 text-gray-700">
             <Trash className="w-4 h-4" /> Delete Column
           </button>

           <div className="h-px bg-gray-200 my-1"></div>

           {/* Merging / Splitting */}
           {selectedCellsCount > 1 && (
               <button onClick={handleMerge} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center gap-2 text-gray-700 font-medium text-blue-600">
                 <Merge className="w-4 h-4" /> Merge Cells
               </button>
           )}
           {canSplit && (
               <button onClick={handleSplit} className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center gap-2 text-gray-700 font-medium text-blue-600">
                 <Split className="w-4 h-4" /> Split Cell
               </button>
           )}

           {/* Background Color */}
           <div className="px-4 py-2">
               <div className="flex items-center gap-2 mb-1 text-xs font-medium text-gray-500">
                   <Palette className="w-3 h-3" /> Background
               </div>
               <div className="flex gap-1">
                   {['#ffffff', '#f3f4f6', '#fee2e2', '#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff'].map(color => (
                       <button
                           key={color}
                           onClick={() => setCellBackground(color)}
                           className="w-5 h-5 rounded border border-gray-300 shadow-sm hover:scale-110 transition-transform"
                           style={{ backgroundColor: color }}
                           title={color}
                       />
                   ))}
               </div>
           </div>
        </>
      )}
    </div>
  );
};