import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';

interface ControlContextMenuProps {
  target: HTMLElement;
  position: { x: number; y: number };
  onClose: () => void;
  onSave: () => void;
}

interface SelectOption {
  text: string;
  value: string;
}

export const ControlContextMenu: React.FC<ControlContextMenuProps> = ({ target, position, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [options, setOptions] = useState<SelectOption[]>([]);
  const tagName = target.tagName;
  const inputType = tagName === 'INPUT' ? (target as HTMLInputElement).type : '';

  useEffect(() => {
    // Initialize state from target element
    setName(target.getAttribute('name') || '');
    
    if (tagName === 'SELECT') {
      const select = target as HTMLSelectElement;
      const opts = Array.from(select.options).map(opt => ({
        text: opt.text,
        value: opt.value
      }));
      setOptions(opts);
    } else {
      // Input or Button
      setValue(target.getAttribute('value') || (target as HTMLInputElement).value || '');
    }
  }, [target, tagName]);

  const handleSave = () => {
    // Update target element
    if (name) target.setAttribute('name', name);
    else target.removeAttribute('name');

    if (tagName === 'SELECT') {
      const select = target as HTMLSelectElement;
      select.innerHTML = ''; // Clear existing
      options.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.text = opt.text;
        optionEl.value = opt.value;
        select.appendChild(optionEl);
      });
    } else {
      // Update value attribute and property
      if (value) {
          target.setAttribute('value', value);
          (target as HTMLInputElement).value = value;
      } else {
          target.removeAttribute('value');
      }
    }

    onSave();
    onClose();
  };

  const handleAddOption = () => {
    setOptions([...options, { text: `Option ${options.length + 1}`, value: `opt_${options.length + 1}` }]);
  };

  const handleUpdateOption = (index: number, field: keyof SelectOption, val: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: val };
    setOptions(newOptions);
  };

  const handleDeleteOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const displayType = tagName === 'INPUT' ? inputType : tagName.toLowerCase();

  return (
    <div 
      className="fixed z-50 bg-white border border-gray-200 shadow-2xl rounded-lg p-4 w-80 text-sm"
      style={{ top: Math.min(window.innerHeight - 400, position.y), left: Math.min(window.innerWidth - 320, position.x) }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
        <h3 className="font-semibold text-gray-800 capitalize">Edit {displayType}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Name Field (Common) */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900"
            placeholder="field_name"
          />
        </div>

        {/* Value Field (Inputs/Buttons only) */}
        {tagName !== 'SELECT' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase">
               {inputType === 'button' || inputType === 'submit' ? 'Label Text' : 'Value'}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900"
              placeholder="Value"
            />
          </div>
        )}

        {/* Options Editor (Select only) */}
        {tagName === 'SELECT' && (
          <div className="space-y-2">
             <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-gray-500 uppercase">Options</label>
                <button 
                  type="button" 
                  onClick={handleAddOption}
                  className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
             </div>
             
             <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-100 rounded p-1">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input 
                      className="flex-1 min-w-0 border border-gray-200 rounded px-1.5 py-1 text-xs bg-white text-gray-900"
                      placeholder="Label"
                      value={opt.text}
                      onChange={(e) => handleUpdateOption(idx, 'text', e.target.value)}
                    />
                    <input 
                      className="flex-1 min-w-0 border border-gray-200 rounded px-1.5 py-1 text-xs bg-white text-gray-900"
                      placeholder="Value"
                      value={opt.value}
                      onChange={(e) => handleUpdateOption(idx, 'value', e.target.value)}
                    />
                    <button 
                      onClick={() => handleDeleteOption(idx)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {options.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">No options</p>}
             </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
            <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded"
            >
                Cancel
            </button>
            <button
                onClick={handleSave}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1"
            >
                <Save className="w-3 h-3" /> Save Changes
            </button>
        </div>
      </div>
    </div>
  );
};