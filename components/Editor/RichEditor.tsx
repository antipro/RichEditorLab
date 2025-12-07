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

  // Table Resizing State
  const resizingRef = useRef<{
    isResizing: boolean;
    target: HTMLElement | null;
    type: 'col' | 'row' | null;
    startX: number;
    startY: number;
    startDimension: number;
  }>({
    isResizing: false,
    target: null,
    type: null,
    startX: 0,
    startY: 0,
    startDimension: 0,
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

  // Save History Helper
  const saveHistory = useCallback((content: string) => {
    setHistory(prev => {
        // If content hasn't changed from the current point in history, don't duplicate
        if (prev[historyIndex] === content) return prev;
        
        // Slice history up to current index and add new content
        const newHistory = [...prev.slice(0, historyIndex + 1), content];
        
        // Optional: limit stack size
        if (newHistory.length > 50) {
            newHistory.shift();
            // Adjust index if we shifted
            setHistoryIndex(newHistory.length - 1);
            return newHistory;
        }

        setHistoryIndex(newHistory.length - 1);
        return newHistory;
    });
  }, [historyIndex]);

  // Update Caret and Save Range
  const updateCaret = useCallback(() => {
    if (!editorRef.current) return;
    
    // Do not update caret while resizing table
    if (resizingRef.current.isResizing) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return; 
    }

    // Check if the focus (cursor position) is inside the editor
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

  // Global Mouse Move for Resizing
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
      const { isResizing, target, type, startX, startY, startDimension } = resizingRef.current;
      if (!isResizing || !target) return;

      e.preventDefault(); // Prevent text selection while dragging

      if (type === 'col') {
          const delta = e.clientX - startX;
          const w = Math.max(30, startDimension + delta);
          target.style.width = `${w}px`;
      } else if (type === 'row') {
          const delta = e.clientY - startY;
          const h = Math.max(20, startDimension + delta);
          const tr = target.closest('tr');
          if (tr) {
              tr.style.height = `${h}px`;
          } else {
              target.style.height = `${h}px`;
          }
      }
  }, []);

  // Global Mouse Up for Resizing
  const handleGlobalMouseUp = useCallback(() => {
      if (resizingRef.current.isResizing) {
          resizingRef.current.isResizing = false;
          resizingRef.current.target = null;
          resizingRef.current.type = null;
          document.body.style.cursor = 'default';
          
          if (editorRef.current) {
             editorRef.current.style.cursor = 'text';
             const content = editorRef.current.innerHTML;
             setHtmlContent(content);
             saveHistory(content);
          }
          
          document.removeEventListener('mousemove', handleGlobalMouseMove);
          document.removeEventListener('mouseup', handleGlobalMouseUp);
      }
  }, [handleGlobalMouseMove, saveHistory]);

  // Editor Mouse Interactions (Hover detection & Start Drag)
  const handleEditorMouseMove = (e: React.MouseEvent) => {
      if (resizingRef.current.isResizing) return;

      const target = e.target as HTMLElement;
      // Only check TD/TH inside the editor
      if ((target.tagName !== 'TD' && target.tagName !== 'TH') || !editorRef.current?.contains(target)) {
          if (editorRef.current && editorRef.current.style.cursor !== 'text') {
              editorRef.current.style.cursor = 'text';
          }
          return;
      }

      const rect = target.getBoundingClientRect();
      // Sensitivity area in pixels
      const threshold = 5; 
      const onRightEdge = Math.abs(e.clientX - rect.right) <= threshold;
      const onBottomEdge = Math.abs(e.clientY - rect.bottom) <= threshold;

      if (onRightEdge) {
          editorRef.current!.style.cursor = 'col-resize';
      } else if (onBottomEdge) {
          editorRef.current!.style.cursor = 'row-resize';
      } else {
          editorRef.current!.style.cursor = 'text';
      }
  };

  const handleEditorMouseDown = (e: React.MouseEvent) => {
      // Hide context menu on left click
      if (contextMenu.visible) {
          setContextMenu({ ...contextMenu, visible: false });
      }

      const cursor = editorRef.current?.style.cursor;
      
      if (cursor === 'col-resize' || cursor === 'row-resize') {
          e.preventDefault(); 
          e.stopPropagation();

          const target = e.target as HTMLElement;
          const isCol = cursor === 'col-resize';
          
          resizingRef.current = {
              isResizing: true,
              target,
              type: isCol ? 'col' : 'row',
              startX: e.clientX,
              startY: e.clientY,
              startDimension: isCol ? target.offsetWidth : (target.closest('tr')?.offsetHeight || target.offsetHeight)
          };

          document.body.style.cursor = cursor;
          document.addEventListener('mousemove', handleGlobalMouseMove);
          document.addEventListener('mouseup', handleGlobalMouseUp);
          return;
      }

      // Normal click: Update caret
      requestAnimationFrame(updateCaret);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    e.preventDefault(); // Prevent default browser context menu
    
    // Check if the target is an editable form control
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
        // Show text context menu, potentially with table context
        const cell = target.closest('td, th') as HTMLElement | null;
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
      
      // If node is text, get parent
      if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentNode;
      }
      
      // Traverse up to find a block element inside the editor
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
          // If no block found (e.g. at root text node), wrap in Paragraph first
          document.execCommand('formatBlock', false, 'p');
          block = getSelectionBlock();
      }
      
      if (block) {
          (block.style as any)[styleProp] = value;
      }
  };

  const handleAction = (action: EditorAction) => {
    // For Undo/Redo we handle history navigation differently
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

    // For other actions, we perform the action and then save history
    switch (action.type) {
      case 'bold':
        document.execCommand('bold');
        break;
      case 'italic':
        document.execCommand('italic');
        break;
      case 'underline':
        document.execCommand('underline');
        break;
      
      case 'fore-color':
        document.execCommand('foreColor', false, action.payload);
        break;
      case 'back-color':
        // 'hiliteColor' is standard for text background color in contentEditable
        document.execCommand('hiliteColor', false, action.payload);
        break;

      case 'set-font-size':
        document.execCommand('fontSize', false, action.payload);
        break;

      case 'align-left':
        document.execCommand('justifyLeft');
        break;
      case 'align-center':
        document.execCommand('justifyCenter');
        break;
      case 'align-right':
        document.execCommand('justifyRight');
        break;
      
      case 'set-line-height':
        if (action.payload) {
            applyStyleToBlock('lineHeight', action.payload);
        }
        break;
        
      case 'set-paragraph-gap':
        if (action.payload) {
            applyStyleToBlock('marginBottom', action.payload);
        }
        break;
      
      case 'format-block':
        if (action.payload) {
            document.execCommand('formatBlock', false, `<${action.payload}>`);
        }
        break;
      
      case 'input-text': {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Type here...';
        // Force light color scheme to prevent dark mode from making this black-on-black
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
        // IMPORTANT: Force light scheme so the checkmark and border are visible on white bg
        checkbox.style.colorScheme = 'light';
        checkbox.className = 'w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 bg-white align-middle';
        const wrapper = createAtomicWrapper(checkbox);
        insertNodeAtCaret(wrapper);
        break;
      }

      case 'input-radio': {
        const radio = document.createElement('input');
        radio.type = 'radio';
        // Give a default name so they can interact as a group in a demo context
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

        // Prevent editor keystrokes while focused on select
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
        // action.payload should be a base64 string from the file reader
        if (action.payload && typeof action.payload === 'string') {
          const img = document.createElement('img');
          img.src = action.payload;
          img.className = 'max-w-full h-auto rounded shadow-lg my-2 border border-gray-200';
          // NOTE: We do not force display: block here anymore to ensure the wrapper 
          // (which is inline-block) handles it like a character. 
          // The max-w-full will handle sizing.
          
          const wrapper = createAtomicWrapper(img);
          // wrapper is naturally inline-block via 'editor-atomic' class
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
            // Use <br> to ensure cell has height but is empty
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
    
    // After action is performed, update state and save history
    if (editorRef.current) {
        const newContent = editorRef.current.innerHTML;
        setHtmlContent(newContent);
        // Force an immediate save for explicit actions
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
            
            // Debounce history saving for typing
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
          
          // Added mouse listeners for Table resizing
          onMouseMove={handleEditorMouseMove}
          onMouseDown={handleEditorMouseDown}
          onContextMenu={handleContextMenu}

          onKeyDown={() => requestAnimationFrame(updateCaret)}
          onKeyUp={() => requestAnimationFrame(updateCaret)}
          onClick={() => requestAnimationFrame(updateCaret)}
          onFocus={() => requestAnimationFrame(updateCaret)}
          onBlur={() => {
              // Intentionally left empty to allow toolbar interactions to reuse lastRangeRef
          }}
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