
export interface CaretPosition {
  top: number;
  left: number;
  height: number;
  visible: boolean;
}

export type EditorTool = 
  | 'bold' 
  | 'italic' 
  | 'underline' 
  | 'strike' 
  | 'fore-color'
  | 'back-color'
  | 'set-font-size'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'set-line-height'
  | 'set-paragraph-gap'
  | 'format-block'
  | 'image'
  | 'table'
  | 'input-text'
  | 'input-checkbox'
  | 'input-radio'
  | 'input-select'
  | 'input-button';

export interface EditorAction {
  type: EditorTool;
  payload?: any;
}
