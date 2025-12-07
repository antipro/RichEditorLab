import React, { useEffect, useState } from 'react';
import { Copy, Scissors, Clipboard, CheckSquare, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Table } from 'lucide-react';

interface TextContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  editorRef: React.RefObject<HTMLDivElement>;
  tableTarget: HTMLElement | null;
}

export const TextContextMenu: React.FC<TextContextMenuProps> = ({ position, onClose, editorRef, tableTarget }) => {
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    const selection = window.getSelection();
    setHasSelection(!!selection && !selection.isCollapsed);
  }, []);

  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        const selection = window.getSelection();
        if (selection) {
             navigator.clipboard.writeText(selection.toString())
                .catch(err => console.error('Clipboard write failed', err));
        }
    } else {
        document.execCommand('copy');
    }
    onClose();
  };

  const handleCut = () => {
    document.execCommand('cut');
    onClose();
  };

  const handlePaste = async () => {
    onClose(); 
    try {
        if (editorRef.current) {
            editorRef.current.focus();
        }
        const text = await navigator.clipboard.readText();
        if (text) {
             if (document.activeElement !== editorRef.current && editorRef.current) {
                editorRef.current.focus();
             }
             document.execCommand('insertText', false, text);
        }
    } catch (err) {
        console.error('Failed to read clipboard', err);
        alert('Paste failed. Please ensure clipboard permissions are allowed or use Ctrl+V.');
    }
  };

  const handleSelectAll = () => {
      if (editorRef.current) {
          editorRef.current.focus();
          document.execCommand('selectAll');
      }
      onClose();
  };

  const notifyChange = () => {
      if (editorRef.current) {
          // Dispatch input event to sync React state in RichEditor
          editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
      }
      onClose();
  };

  const insertRow = (before: boolean) => {
      if (!tableTarget) return;
      const row = tableTarget.closest('tr');
      const tbody = row?.parentElement;
      if (!row || !tbody) return;

      const newRow = row.cloneNode(true) as HTMLTableRowElement;
      Array.from(newRow.children).forEach(child => {
          child.innerHTML = '<br>'; // Reset content
      });

      if (before) {
          tbody.insertBefore(newRow, row);
      } else {
          tbody.insertBefore(newRow, row.nextSibling);
      }
      notifyChange();
  };

  const insertCol = (before: boolean) => {
      if (!tableTarget) return;
      const cell = tableTarget;
      const row = cell.parentElement;
      const table = row?.closest('table');
      if (!row || !table) return;

      const cellIndex = Array.from(row.children).indexOf(cell);
      
      const rows = table.querySelectorAll('tr');
      rows.forEach(tr => {
          // If the row doesn't have a cell at this index (e.g. colspans), this naive approach might fail,
          // but it covers the basic grid case required.
          if (tr.children.length <= cellIndex) return;

          const referenceNode = tr.children[cellIndex];
          const newCell = document.createElement(referenceNode.tagName);
          newCell.className = referenceNode.className;
          newCell.innerHTML = '<br>';
          newCell.style.cssText = (referenceNode as HTMLElement).style.cssText;

          if (before) {
              tr.insertBefore(newCell, referenceNode);
          } else {
              tr.insertBefore(newCell, referenceNode.nextSibling);
          }
      });
      notifyChange();
  };

  return (
    <div 
      className="fixed z-50 bg-white border border-gray-200 shadow-2xl rounded-lg py-1 w-56 text-sm select-none"
      style={{ 
          top: Math.min(window.innerHeight - (tableTarget ? 350 : 200), position.y), 
          left: Math.min(window.innerWidth - 224, position.x) 
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button 
        onClick={handleCopy}
        disabled={!hasSelection}
        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
      >
        <Copy className="w-4 h-4" /> Copy
      </button>
      <button 
        onClick={handleCut}
        disabled={!hasSelection}
        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
      >
        <Scissors className="w-4 h-4" /> Cut
      </button>
      <button 
        onClick={handlePaste}
        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
      >
        <Clipboard className="w-4 h-4" /> Paste
      </button>
      <div className="h-px bg-gray-200 my-1"></div>
      <button 
        onClick={handleSelectAll}
        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
      >
        <CheckSquare className="w-4 h-4" /> Select All
      </button>

      {tableTarget && (
        <>
           <div className="h-px bg-gray-200 my-1"></div>
           <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
             <Table className="w-3 h-3" /> Table Options
           </div>
           <button 
             onClick={() => insertCol(true)}
             className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
           >
             <ArrowLeft className="w-4 h-4" /> Add Col Before
           </button>
           <button 
             onClick={() => insertCol(false)}
             className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
           >
             <ArrowRight className="w-4 h-4" /> Add Col After
           </button>
           <button 
             onClick={() => insertRow(true)}
             className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
           >
             <ArrowUp className="w-4 h-4" /> Add Row Before
           </button>
           <button 
             onClick={() => insertRow(false)}
             className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
           >
             <ArrowDown className="w-4 h-4" /> Add Row After
           </button>
        </>
      )}
    </div>
  );
};