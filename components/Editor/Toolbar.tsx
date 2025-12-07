import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Image as ImageIcon, 
  Table as TableIcon, 
  BoxSelect, 
  MousePointerClick,
  CheckSquare,
  CircleDot,
  List,
  ChevronDown,
  PlusSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoveVertical,
  BetweenHorizontalStart,
  Type,
  Highlighter,
  ALargeSmall,
  Undo,
  Redo
} from 'lucide-react';
import { EditorAction } from '../../types';

interface ToolbarProps {
  onAction: (action: EditorAction) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onAction }) => {
  const [showControlPicker, setShowControlPicker] = useState(false);
  
  const controlContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textColorInputRef = useRef<HTMLInputElement>(null);
  const bgColorInputRef = useRef<HTMLInputElement>(null);

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (controlContainerRef.current && !controlContainerRef.current.contains(event.target as Node)) {
        setShowControlPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        if (base64) {
          onAction({ type: 'image', payload: base64 });
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleColorChange = (type: 'fore-color' | 'back-color', e: React.ChangeEvent<HTMLInputElement>) => {
      onAction({ type, payload: e.target.value });
  };

  const Button = ({ tool, icon: Icon, label, onClick, active }: { tool?: any, icon: any, label: string, onClick?: () => void, active?: boolean }) => (
    <button
      onMouseDown={(e) => {
        // Prevent default to avoid losing focus from the editor
        e.preventDefault();
        if (onClick) {
            onClick();
        } else if (tool) {
            onAction({ type: tool });
        }
      }}
      className={`p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors flex items-center gap-1 text-sm font-medium ${active ? 'bg-gray-200' : ''}`}
      title={label}
      type="button"
    >
      <Icon className="w-4 h-4" />
      <span className="sr-only sm:not-sr-only hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 p-2 bg-white sticky top-0 z-20">
      
      {/* Hidden Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload} 
      />
      <input
        type="color"
        ref={textColorInputRef}
        className="hidden"
        onChange={(e) => handleColorChange('fore-color', e)}
      />
      <input
        type="color"
        ref={bgColorInputRef}
        className="hidden"
        onChange={(e) => handleColorChange('back-color', e)}
      />

      <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200">
        <Button tool="undo" icon={Undo} label="Undo" />
        <Button tool="redo" icon={Redo} label="Redo" />
      </div>

      <div className="flex items-center gap-2 px-2 border-r border-gray-200">
        <select
          className="h-8 border border-gray-200 rounded text-sm text-gray-600 focus:outline-none bg-white px-2 cursor-pointer hover:bg-gray-50 w-32"
          onChange={(e) => {
             onAction({ type: 'format-block', payload: e.target.value });
          }}
          defaultValue="p"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="blockquote">Quote</option>
          <option value="pre">Code</option>
        </select>
      </div>

      <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
        <Button tool="bold" icon={Bold} label="Bold" />
        <Button tool="italic" icon={Italic} label="Italic" />
        <Button tool="underline" icon={Underline} label="Underline" />
      </div>

      <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
         <Button 
            icon={Type} 
            label="Text Color" 
            onClick={() => textColorInputRef.current?.click()} 
         />
         <Button 
            icon={Highlighter} 
            label="Bg Color" 
            onClick={() => bgColorInputRef.current?.click()} 
         />
      </div>

      <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
        <Button tool="align-left" icon={AlignLeft} label="Left" />
        <Button tool="align-center" icon={AlignCenter} label="Center" />
        <Button tool="align-right" icon={AlignRight} label="Right" />
      </div>

      {/* Font Size & Spacing Controls */}
      <div className="flex items-center gap-2 px-2 border-r border-gray-200">
        <div className="flex items-center gap-1" title="Font Size">
           <ALargeSmall className="w-4 h-4 text-gray-500" />
           <select 
             className="h-8 w-20 text-sm border-none focus:ring-0 cursor-pointer bg-transparent text-gray-600"
             onChange={(e) => onAction({ type: 'set-font-size', payload: e.target.value })}
             defaultValue="3"
           >
             <option value="1">Tiny</option>
             <option value="2">Small</option>
             <option value="3">Normal</option>
             <option value="4">Large</option>
             <option value="5">Huge</option>
             <option value="6">Mega</option>
             <option value="7">Uber</option>
           </select>
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1"></div>

        <div className="flex items-center gap-1" title="Line Height">
           <MoveVertical className="w-4 h-4 text-gray-500" />
           <select 
             className="h-8 w-16 text-sm border-none focus:ring-0 cursor-pointer bg-transparent text-gray-600"
             onChange={(e) => onAction({ type: 'set-line-height', payload: e.target.value })}
             defaultValue="1.5"
           >
             <option value="1.0">1.0</option>
             <option value="1.15">1.15</option>
             <option value="1.5">1.5</option>
             <option value="2.0">2.0</option>
             <option value="2.5">2.5</option>
             <option value="3.0">3.0</option>
           </select>
        </div>
        
        <div className="flex items-center gap-1" title="Paragraph Gap (Margin Bottom)">
           <BetweenHorizontalStart className="w-4 h-4 text-gray-500" />
           <select 
             className="h-8 w-16 text-sm border-none focus:ring-0 cursor-pointer bg-transparent text-gray-600"
             onChange={(e) => onAction({ type: 'set-paragraph-gap', payload: e.target.value })}
             defaultValue="1em"
           >
             <option value="0px">0px</option>
             <option value="4px">4px</option>
             <option value="8px">8px</option>
             <option value="12px">12px</option>
             <option value="1em">1em</option>
             <option value="24px">24px</option>
             <option value="32px">32px</option>
           </select>
        </div>
      </div>
      
      <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
        <Button 
            icon={ImageIcon} 
            label="Img" 
            onClick={() => fileInputRef.current?.click()} 
        />
        
        <Button 
            icon={TableIcon} 
            label="Table" 
            onClick={() => onAction({ type: 'table', payload: { rows: 3, cols: 3 } })} 
        />
      </div>

      {/* Controls Dropdown */}
      <div className="flex items-center gap-0.5 px-2 relative" ref={controlContainerRef}>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setShowControlPicker(!showControlPicker);
          }}
          className={`flex items-center gap-1 px-2 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors ${showControlPicker ? 'bg-gray-200' : ''}`}
        >
           <PlusSquare className="w-4 h-4" />
           <span>Controls</span>
           <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
        </button>

        {showControlPicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg p-1.5 z-50 flex flex-col gap-1 w-40">
             <button
               className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded text-sm text-gray-700 w-full text-left"
               onMouseDown={(e) => { e.preventDefault(); onAction({ type: 'input-text' }); setShowControlPicker(false); }}
             >
               <BoxSelect className="w-4 h-4 text-gray-500" /> Input
             </button>
             <button
               className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded text-sm text-gray-700 w-full text-left"
               onMouseDown={(e) => { e.preventDefault(); onAction({ type: 'input-checkbox' }); setShowControlPicker(false); }}
             >
               <CheckSquare className="w-4 h-4 text-gray-500" /> Checkbox
             </button>
             <button
               className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded text-sm text-gray-700 w-full text-left"
               onMouseDown={(e) => { e.preventDefault(); onAction({ type: 'input-radio' }); setShowControlPicker(false); }}
             >
               <CircleDot className="w-4 h-4 text-gray-500" /> Radio
             </button>
             <button
               className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded text-sm text-gray-700 w-full text-left"
               onMouseDown={(e) => { e.preventDefault(); onAction({ type: 'input-select' }); setShowControlPicker(false); }}
             >
               <List className="w-4 h-4 text-gray-500" /> Select
             </button>
             <div className="h-px bg-gray-100 my-0.5"></div>
             <button
               className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded text-sm text-gray-700 w-full text-left"
               onMouseDown={(e) => { e.preventDefault(); onAction({ type: 'input-button' }); setShowControlPicker(false); }}
             >
               <MousePointerClick className="w-4 h-4 text-gray-500" /> Button
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;