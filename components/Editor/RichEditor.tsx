import React, { useRef, useEffect, useState, useCallback } from 'react';
import Toolbar from './Toolbar';
import { CustomCaret } from './CustomCaret';
import { CaretPosition, EditorAction } from '../../types';
import { getCaretCoordinates, insertNodeAtCaret, createAtomicWrapper } from '../../utils/domUtils';
import { ControlContextMenu } from './ControlContextMenu';
import { TextContextMenu } from './TextContextMenu';

const EXAMPLE_CONTENT = `
<h1 style="text-align: center;">Welcome to Rich Editor Lab</h1>
<p style="text-align: center; color: #666;"><em>A sophisticated editor with a custom-rendered caret &amp; embedded controls.</em></p>
<hr style="margin: 1em 0;" />
<h3>✨ Key Features</h3>
<ul>
<li><strong>Custom Rendering:</strong> The blinking cursor is a React component synced to the DOM Selection API.</li>
<li><strong>Rich Formatting:</strong> Support for <span style="color: #2563eb; font-weight: bold;">custom colors</span>, <span style="font-size: x-large;">sizes</span>, and <span style="background-color: #fef08a;">highlights</span>.</li>
<li><strong>Form Controls:</strong> We treat inputs as "atomic" blocks. Try clicking the checkbox: <span class="editor-atomic mx-1" contenteditable="false"><input type="checkbox" style="color-scheme: light;" class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 bg-white align-middle"></span></li>
</ul>
<h3>📊 Dynamic Tables</h3>
<p>Right-click inside any cell to access the <strong>context menu</strong> for adding rows or columns. You can also drag the cell borders to resize them.</p>
<table class="w-full text-sm text-left text-gray-500 my-4 border-collapse border border-gray-200 bg-white">
  <tbody>
    <tr>
      <td class="border border-gray-300 p-2 min-w-[50px] h-8" style="background-color: #f9fafb;"><strong>Feature</strong></td>
      <td class="border border-gray-300 p-2 min-w-[50px] h-8" style="background-color: #f9fafb;"><strong>Status</strong></td>
      <td class="border border-gray-300 p-2 min-w-[50px] h-8" style="background-color: #f9fafb;"><strong>Notes</strong></td>
    </tr>
    <tr>
      <td class="border border-gray-300 p-2 min-w-[50px] h-8">Resizing</td>
      <td class="border border-gray-300 p-2 min-w-[50px] h-8">✅ Ready</td>
      <td class="border border-gray-300 p-2 min-w-[50px] h-8">Hover cell edges</td>
    </tr>
    <tr>
      <td class="border border-gray-300 p-2 min-w-[50px] h-8">Context Menu</td>
      <td class="border border-gray-300 p-2 min-w-[50px] h-8">✅ Ready</td>
      <td class="border border-gray-300 p-2 min-w-[50px] h-8">Right-click table</td>
    </tr>
  </tbody>
</table>
<p>Go ahead, <strong>delete all of this</strong> and start writing your own story!</p>
`;

const RichEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastRangeRef = useRef<Range | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [caret, setCaret] = useState<CaretPosition>({ top: 0, left: 0, height: 20, visible: false });
  const [htmlContent, setHtmlContent] = useState<string>(''); 

  // History State
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    type: 'control' | 'text' | null;
    target: HTMLElement | null;
    tableTarget: HTMLElement | null;
  }>({ visible: false, x: 0, y: 0, type: null, target: null, tableTarget: null });

  // Mouse Interaction State
  const interactionRef = useRef<{
    isResizing: boolean;
    resizeTarget: HTMLElement | null;
    resizeType: 'col' | 'row' | null;
    startX: number;
    startY: number;
    startDimension: number;
    
    isSelectingCells: boolean;
    selectionStartCell: HTMLElement | null;
  }>({
    isResizing: false,
    resizeTarget: null,
    resizeType: null,
    startX: 0,
    startY: 0,
    startDimension: 0,
    
    isSelectingCells: false,
    selectionStartCell: null,
  });

  // Initialize content once on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = EXAMPLE_CONTENT;
      const initialContent = editorRef.current.innerHTML;
      setHtmlContent(initialContent);
      setHistory([initialContent]);
      setHistoryIndex(0);
    }
  }, []);

  const saveHistory = useCallback((content: string) => {
    setHistory(prev => {
        if (prev[historyIndex] === content) return prev;
        const newHistory = [...prev.slice(0, historyIndex + 1), content];
        if (newHistory.length > 50) {
            newHistory.shift();
            setHistoryIndex(newHistory.length - 1);
            return newHistory;
        }
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
    });
  }, [historyIndex]);

  const updateCaret = useCallback(() => {
    if (!editorRef.current) return;
    if (interactionRef.current.isResizing || interactionRef.current.isSelectingCells) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    if (selection.focusNode && editorRef.current.contains(selection.focusNode)) {
        lastRangeRef.current = selection.getRangeAt(0).cloneRange();
        const coords = getCaretCoordinates(editorRef.current);
        if (coords) {
          setCaret({ ...coords, visible: true });
        }
    } else {
        setCaret(prev => ({ ...prev, visible: false }));
    }
  }, []);

  // --- Table Selection Helpers ---
  
  const clearCellSelection = () => {
      if (!editorRef.current) return;
      editorRef.current.querySelectorAll('.selected-cell').forEach(el => {
          el.classList.remove('selected-cell');
      });
  };

  const getCellGridPosition = (cell: HTMLElement) => {
      const row = cell.closest('tr');
      if (!row) return null;
      const table = row.closest('table');
      if (!table) return null;
      
      const rowIndex = Array.from(table.rows).indexOf(row);
      // Simple index lookup (doesn't account for colspans perfectly in complex tables but works for basic grid)
      const colIndex = Array.from(row.children).indexOf(cell);
      
      return { rowIndex, colIndex, table };
  };

  const selectCells = (start: HTMLElement, end: HTMLElement) => {
      clearCellSelection();
      const startPos = getCellGridPosition(start);
      const endPos = getCellGridPosition(end);
      
      if (!startPos || !endPos || startPos.table !== endPos.table) return;

      const minRow = Math.min(startPos.rowIndex, endPos.rowIndex);
      const maxRow = Math.max(startPos.rowIndex, endPos.rowIndex);
      const minCol = Math.min(startPos.colIndex, endPos.colIndex);
      const maxCol = Math.max(startPos.colIndex, endPos.colIndex);

      const table = startPos.table;
      for (let r = minRow; r <= maxRow; r++) {
          const row = table.rows[r];
          for (let c = minCol; c <= maxCol; c++) {
              if (row.children[c]) {
                  row.children[c].classList.add('selected-cell');
              }
          }
      }
      
      // Hide native text selection to avoid confusion
      window.getSelection()?.removeAllRanges();
  };

  const selectColumn = (cell: HTMLElement) => {
      clearCellSelection();
      const pos = getCellGridPosition(cell);
      if (!pos) return;
      
      Array.from(pos.table.rows).forEach(row => {
          if (row.children[pos.colIndex]) {
              row.children[pos.colIndex].classList.add('selected-cell');
          }
      });
      window.getSelection()?.removeAllRanges();
  };

  const selectRow = (cell: HTMLElement) => {
      clearCellSelection();
      const row = cell.closest('tr');
      if (row) {
          Array.from(row.children).forEach(child => child.classList.add('selected-cell'));
      }
      window.getSelection()?.removeAllRanges();
  };

  // --- Global Mouse Handlers ---

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
      const state = interactionRef.current;
      
      // Handle Resizing
      if (state.isResizing && state.resizeTarget) {
          e.preventDefault();
          if (state.resizeType === 'col') {
              const delta = e.clientX - state.startX;
              const w = Math.max(30, state.startDimension + delta);
              state.resizeTarget.style.width = `${w}px`;
          } else if (state.resizeType === 'row') {
              const delta = e.clientY - state.startY;
              const h = Math.max(20, state.startDimension + delta);
              const tr = state.resizeTarget.closest('tr');
              if (tr) {
                  tr.style.height = `${h}px`;
              } else {
                  state.resizeTarget.style.height = `${h}px`;
              }
          }
          return;
      }

      // Handle Cell Selection Drag
      if (state.isSelectingCells && state.selectionStartCell) {
          const target = e.target as HTMLElement;
          const cell = target.closest('td, th') as HTMLElement;
          if (cell && editorRef.current?.contains(cell)) {
             selectCells(state.selectionStartCell, cell);
          }
      }
  }, []);

  const handleGlobalMouseUp = useCallback(() => {
      const state = interactionRef.current;
      
      if (state.isResizing) {
          state.isResizing = false;
          state.resizeTarget = null;
          state.resizeType = null;
          document.body.style.cursor = 'default';
          if (editorRef.current) {
             editorRef.current.style.cursor = 'text';
             const content = editorRef.current.innerHTML;
             setHtmlContent(content);
             saveHistory(content);
          }
      }

      if (state.isSelectingCells) {
          state.isSelectingCells = false;
          state.selectionStartCell = null;
      }
      
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseMove, saveHistory]);

  // --- Editor Mouse Handlers ---

  const handleEditorMouseMove = (e: React.MouseEvent) => {
      if (interactionRef.current.isResizing || interactionRef.current.isSelectingCells) return;

      const target = e.target as HTMLElement;
      
      // We only care about interactions within tables
      const cell = target.closest('td, th') as HTMLElement;
      if (!cell || !editorRef.current?.contains(cell)) {
          if (editorRef.current && editorRef.current.style.cursor !== 'text') {
              editorRef.current.style.cursor = 'text';
          }
          return;
      }

      const rect = cell.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      
      // Zones
      const borderThreshold = 5;
      const cornerThreshold = 10;
      
      const onRightEdge = Math.abs(e.clientX - rect.right) <= borderThreshold;
      const onBottomEdge = Math.abs(e.clientY - rect.bottom) <= borderThreshold;
      
      const inCorner = offsetX < cornerThreshold && offsetY < cornerThreshold;
      const inTopZone = offsetY <= borderThreshold && !inCorner; // avoid conflict
      const inLeftZone = offsetX <= borderThreshold && !inCorner;

      // Cursor Logic
      if (onRightEdge) {
          editorRef.current!.style.cursor = 'col-resize';
      } else if (onBottomEdge) {
          editorRef.current!.style.cursor = 'row-resize';
      } else if (inCorner) {
          editorRef.current!.style.cursor = 'cell'; // Indicates selection
      } else if (inTopZone) {
          const row = cell.closest('tr');
          const table = cell.closest('table');
          const isFirstRow = row && table && table.rows[0] === row;
          
          if (isFirstRow) editorRef.current!.style.cursor = 's-resize';
          else editorRef.current!.style.cursor = 'text';
      } else if (inLeftZone) {
           // Left of row
          const row = cell.closest('tr');
          const isFirstCell = row && row.children[0] === cell;
          
          if (isFirstCell) editorRef.current!.style.cursor = 'e-resize';
          else editorRef.current!.style.cursor = 'text';
      } else {
          editorRef.current!.style.cursor = 'text';
      }
  };

  const handleEditorMouseDown = (e: React.MouseEvent) => {
      // Ignore right clicks (button 2) in mousedown to let context menu logic handle selection
      if (e.button === 2) return;

      if (contextMenu.visible) {
          setContextMenu({ ...contextMenu, visible: false });
      }

      const cursor = editorRef.current?.style.cursor;
      const target = e.target as HTMLElement;
      const cell = target.closest('td, th') as HTMLElement;

      // 1. Resizing
      if (cursor === 'col-resize' || cursor === 'row-resize') {
          e.preventDefault(); 
          e.stopPropagation();
          
          interactionRef.current = {
              ...interactionRef.current,
              isResizing: true,
              resizeTarget: cell,
              resizeType: cursor === 'col-resize' ? 'col' : 'row',
              startX: e.clientX,
              startY: e.clientY,
              startDimension: cursor === 'col-resize' ? cell.offsetWidth : (cell.closest('tr')?.offsetHeight || cell.offsetHeight)
          };

          document.body.style.cursor = cursor;
          document.addEventListener('mousemove', handleGlobalMouseMove);
          document.addEventListener('mouseup', handleGlobalMouseUp);
          return;
      }

      // 2. Selection (Row/Col/Corner)
      if (cell) {
          if (cursor === 's-resize') {
              e.preventDefault(); // Stop text cursor
              selectColumn(cell);
              return;
          }
          if (cursor === 'e-resize') {
              e.preventDefault();
              selectRow(cell);
              return;
          }
          if (cursor === 'cell') {
              e.preventDefault();
              
              // Multi-select support
              if (e.ctrlKey || e.metaKey) {
                  if (cell.classList.contains('selected-cell')) {
                      cell.classList.remove('selected-cell');
                  } else {
                      cell.classList.add('selected-cell');
                  }
                  return;
              }

              // Start Drag Selection
              clearCellSelection();
              cell.classList.add('selected-cell');
              
              interactionRef.current = {
                  ...interactionRef.current,
                  isSelectingCells: true,
                  selectionStartCell: cell
              };
              
              document.addEventListener('mousemove', handleGlobalMouseMove);
              document.addEventListener('mouseup', handleGlobalMouseUp);
              return;
          }
      }
      
      // Normal click inside content: clear special selection
      clearCellSelection();
      requestAnimationFrame(updateCaret);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    e.preventDefault(); 
    
    if (['INPUT', 'SELECT', 'BUTTON'].includes(target.tagName)) {
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            type: 'control',
            target: target,
            tableTarget: null
        });
    } else {
        const cell = target.closest('td, th') as HTMLElement | null;
        
        // Handle selection logic for Right Click
        if (cell) {
            const isSelected = cell.classList.contains('selected-cell');
            
            if (e.ctrlKey || e.metaKey) {
                // Multi-select with modifier: Add to selection if not present
                if (!isSelected) {
                    cell.classList.add('selected-cell');
                }
                // Do NOT clear others
            } else {
                // Normal right click
                if (!isSelected) {
                    // Right clicking unselected cell -> Clear others
                    clearCellSelection();
                    // We don't force select this one visually unless we want to
                    // but logic in TextContextMenu uses tableTarget as fallback.
                    // However, to be consistent with 'selected-cell' logic:
                    // cell.classList.add('selected-cell'); 
                    // Let's stick to existing behavior where it just provides context for that cell.
                }
            }
        }

        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            type: 'text',
            target: null,
            tableTarget: cell
        });
    }
  };

  // Listen for global events
  useEffect(() => {
    const handleSelectionChange = () => requestAnimationFrame(updateCaret);
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [updateCaret, handleGlobalMouseMove, handleGlobalMouseUp]);

  // --- Reuse existing helpers ---
  const restoreSelection = () => {
      editorRef.current?.focus();
      const selection = window.getSelection();
      if (lastRangeRef.current && selection) {
          selection.removeAllRanges();
          selection.addRange(lastRangeRef.current);
      }
  };

  const restoreCaretToEnd = () => {
      if (editorRef.current) {
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
          updateCaret();
      }
  };

  const getSelectionBlock = (): HTMLElement | null => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;
      let node: Node | null = selection.anchorNode;
      if (!node) return null;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      let current = node as HTMLElement;
      while (current && current !== editorRef.current) {
          const display = window.getComputedStyle(current).display;
          if (display === 'block' || display === 'list-item' || display === 'flex' || display === 'table' || current.tagName === 'P' || current.tagName === 'DIV' || /^H[1-6]$/.test(current.tagName)) {
              return current;
          }
          current = current.parentElement as HTMLElement;
      }
      return null;
  };

  const applyStyleToBlock = (styleProp: keyof CSSStyleDeclaration, value: string) => {
      let block = getSelectionBlock();
      if (!block) {
          document.execCommand('formatBlock', false, 'p');
          block = getSelectionBlock();
      }
      if (block) {
          (block.style as any)[styleProp] = value;
      }
  };

  const handleAction = (action: EditorAction) => {
    if (action.type === 'undo') {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            const content = history[newIndex];
            if (editorRef.current) {
                editorRef.current.innerHTML = content;
                setHtmlContent(content);
                restoreCaretToEnd();
            }
        }
        return;
    }
    
    if (action.type === 'redo') {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            const content = history[newIndex];
            if (editorRef.current) {
                editorRef.current.innerHTML = content;
                setHtmlContent(content);
                restoreCaretToEnd();
            }
        }
        return;
    }

    restoreSelection();

    switch (action.type) {
      case 'bold': document.execCommand('bold'); break;
      case 'italic': document.execCommand('italic'); break;
      case 'underline': document.execCommand('underline'); break;
      case 'fore-color': document.execCommand('foreColor', false, action.payload); break;
      case 'back-color': document.execCommand('hiliteColor', false, action.payload); break;
      case 'set-font-size': document.execCommand('fontSize', false, action.payload); break;
      case 'align-left': document.execCommand('justifyLeft'); break;
      case 'align-center': document.execCommand('justifyCenter'); break;
      case 'align-right': document.execCommand('justifyRight'); break;
      case 'set-line-height': if (action.payload) applyStyleToBlock('lineHeight', action.payload); break;
      case 'set-paragraph-gap': if (action.payload) applyStyleToBlock('marginBottom', action.payload); break;
      case 'format-block': if (action.payload) document.execCommand('formatBlock', false, `<${action.payload}>`); break;
      case 'horizontal-rule': {
          const hr = document.createElement('hr');
          hr.className = 'my-4 border-gray-300';
          insertNodeAtCaret(hr);
          break;
      }
      case 'input-text': {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Type here...';
        input.style.colorScheme = 'light';
        input.className = 'bg-white text-gray-900 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none shadow-sm';
        input.onkeydown = (e) => e.stopPropagation(); 
        const wrapper = createAtomicWrapper(input);
        insertNodeAtCaret(wrapper);
        break;
      }
      case 'input-checkbox': {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.colorScheme = 'light';
        checkbox.className = 'w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 bg-white align-middle';
        const wrapper = createAtomicWrapper(checkbox);
        insertNodeAtCaret(wrapper);
        break;
      }
      case 'input-radio': {
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'editor-radio-group';
        radio.style.colorScheme = 'light';
        radio.className = 'w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 bg-white align-middle';
        const wrapper = createAtomicWrapper(radio);
        insertNodeAtCaret(wrapper);
        break;
      }
      case 'input-select': {
        const select = document.createElement('select');
        select.style.colorScheme = 'light';
        select.className = 'bg-white text-gray-900 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none shadow-sm';
        ['Option 1', 'Option 2', 'Option 3'].forEach(text => {
            const option = document.createElement('option');
            option.value = text;
            option.text = text;
            select.appendChild(option);
        });
        select.onkeydown = (e) => e.stopPropagation();
        const wrapper = createAtomicWrapper(select);
        insertNodeAtCaret(wrapper);
        break;
      }
      case 'input-button': {
        const btn = document.createElement('button');
        btn.innerText = 'Click Me';
        btn.className = 'bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors shadow-sm';
        btn.contentEditable = 'false';
        btn.onclick = () => alert('Embedded button clicked!');
        const wrapper = createAtomicWrapper(btn);
        insertNodeAtCaret(wrapper);
        break;
      }
      case 'image': {
        if (action.payload && typeof action.payload === 'string') {
          const img = document.createElement('img');
          img.src = action.payload;
          img.className = 'max-w-full h-auto rounded shadow-lg my-2 border border-gray-200';
          const wrapper = createAtomicWrapper(img);
          insertNodeAtCaret(wrapper);
        }
        break;
      }
      case 'table': {
        const { rows, cols } = action.payload || { rows: 3, cols: 3 };
        const table = document.createElement('table');
        table.className = 'w-full text-sm text-left text-gray-500 my-4 border-collapse border border-gray-200 bg-white';
        const tbody = document.createElement('tbody');
        for (let i = 0; i < rows; i++) {
          const tr = document.createElement('tr');
          for (let j = 0; j < cols; j++) {
            const td = document.createElement('td');
            td.className = 'border border-gray-300 p-2 min-w-[50px] h-8';
            td.innerHTML = '<br>';
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        insertNodeAtCaret(table);
        break;
      }
    }
    
    if (editorRef.current) {
        const newContent = editorRef.current.innerHTML;
        setHtmlContent(newContent);
        saveHistory(newContent);
    }
    requestAnimationFrame(updateCaret);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 relative">
      <Toolbar onAction={handleAction} />
      
      <div className="relative flex-1 overflow-hidden">
        <CustomCaret position={caret} />

        <div
          ref={editorRef}
          className="custom-caret-editor prose prose-lg max-w-none h-full p-8 overflow-y-auto outline-none prose-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => {
            const val = e.currentTarget.innerHTML;
            setHtmlContent(val);
            updateCaret();
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                saveHistory(val);
            }, 700);
          }}
          onScroll={() => {
              updateCaret();
              if (contextMenu.visible) {
                  setContextMenu({ ...contextMenu, visible: false });
              }
          }}
          onMouseMove={handleEditorMouseMove}
          onMouseDown={handleEditorMouseDown}
          onContextMenu={handleContextMenu}
          onKeyDown={() => requestAnimationFrame(updateCaret)}
          onKeyUp={() => requestAnimationFrame(updateCaret)}
          onClick={() => requestAnimationFrame(updateCaret)}
          onFocus={() => requestAnimationFrame(updateCaret)}
          onBlur={() => {}}
        />
        
        {contextMenu.visible && (
            <>
                {contextMenu.type === 'control' && contextMenu.target && (
                    <ControlContextMenu 
                        target={contextMenu.target}
                        position={{ x: contextMenu.x, y: contextMenu.y }}
                        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
                        onSave={() => {
                            if (editorRef.current) {
                                const newContent = editorRef.current.innerHTML;
                                setHtmlContent(newContent);
                                saveHistory(newContent);
                            }
                        }}
                    />
                )}
                {contextMenu.type === 'text' && (
                    <TextContextMenu 
                        position={{ x: contextMenu.x, y: contextMenu.y }}
                        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
                        editorRef={editorRef}
                        tableTarget={contextMenu.tableTarget}
                    />
                )}
            </>
        )}
      </div>
      
      <div className="bg-gray-50 p-2 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
         <div className="flex gap-4">
             <span>Words: {htmlContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w.length > 0).length}</span>
             <span>History: {historyIndex + 1} / {history.length}</span>
         </div>
         <span>Rich Editor Lab Active</span>
      </div>
    </div>
  );
};

export default RichEditor;