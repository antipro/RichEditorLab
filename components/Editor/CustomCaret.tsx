import React from 'react';
import { CaretPosition } from '../../types';

interface CustomCaretProps {
  position: CaretPosition;
}

export const CustomCaret: React.FC<CustomCaretProps> = ({ position }) => {
  if (!position.visible) return null;

  return (
    <span
      className="absolute bg-blue-600 w-0.5 animate-custom-blink pointer-events-none transition-all duration-75 ease-out z-10"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        height: `${position.height}px`,
        // If height is unreasonably small/large, clamp it for aesthetics
        minHeight: '1.2em', 
      }}
    />
  );
};