/**
 * Inserts a DOM node at the current selection range.
 */
export const insertNodeAtCaret = (node: Node) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);

  // Move caret after the inserted node
  range.setStartAfter(node);
  range.setEndAfter(node);
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * Creates a form control wrapper that is contentEditable=false
 * This ensures the editor treats it as a single atomic unit.
 */
export const createAtomicWrapper = (element: HTMLElement) => {
  const wrapper = document.createElement('span');
  wrapper.className = 'editor-atomic mx-1';
  wrapper.contentEditable = 'false';
  wrapper.appendChild(element);
  return wrapper;
};

/**
 * Calculates the caret coordinates relative to the editor container.
 */
export const getCaretCoordinates = (editorEl: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  // Create a collapsed range at the focus point (active end of selection).
  // This ensures the caret follows the cursor even during backward selection.
  const range = document.createRange();
  
  if (selection.focusNode) {
    range.setStart(selection.focusNode, selection.focusOffset);
    range.collapse(true);
  } else {
    // Fallback: use the end of the first range
    const r = selection.getRangeAt(0);
    range.setStart(r.endContainer, r.endOffset);
    range.collapse(true);
  }

  let rect: DOMRect | null = null;

  // Method 1: getClientRects
  // This works well for uncollapsed ranges, but for collapsed ranges (caret),
  // Chrome often returns 0 rects unless inside specific text nodes.
  const clientRects = range.getClientRects();
  if (clientRects.length > 0) {
    rect = clientRects[0] as DOMRect;
  } else {
    // Method 2: Temporary span insertion
    // This is robust for empty lines or specific cursor placements where getClientRects fails.
    try {
        const tempRange = range.cloneRange();
        const span = document.createElement('span');
        // Use zero-width space to measure position without affecting layout visually
        span.appendChild(document.createTextNode('\u200b')); 
        tempRange.insertNode(span);
        rect = span.getBoundingClientRect();
        
        const parent = span.parentNode;
        if (parent) {
            parent.removeChild(span);
            // Normalizing merges the split text nodes back together
            parent.normalize(); 
        }
    } catch (e) {
        // Fallback: just use the container's rect
        if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
            rect = (range.startContainer as Element).getBoundingClientRect();
        } else if (range.startContainer.parentElement) {
            rect = range.startContainer.parentElement.getBoundingClientRect();
        }
    }
  }

  if (!rect) return null;

  const editorRect = editorEl.getBoundingClientRect();

  return {
    top: rect.top - editorRect.top + editorEl.scrollTop,
    left: rect.left - editorRect.left + editorEl.scrollLeft,
    height: rect.height || 20 // Default height if 0
  };
};