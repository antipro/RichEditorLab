import React from 'react';
import RichEditor from './components/Editor/RichEditor';
import { PenTool } from 'lucide-react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl space-y-6">
        
        <header className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-blue-600 rounded-lg shadow-lg">
            <PenTool className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Rich Editor Lab</h1>
            <p className="text-gray-500 text-sm mt-1">
              A powerful text editor with embedded controls and a custom rendered caret.
            </p>
          </div>
        </header>

        <main className="h-[700px] w-full">
          <RichEditor />
        </main>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Custom Caret</h3>
            <p>
              The blinking cursor is a separate React component synced to the <code>Selection</code> API. 
              The native caret is hidden via CSS.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Form Controls</h3>
            <p>
              Inject native HTML inputs and buttons. They are wrapped in <code>contentEditable=false</code> containers 
              so they behave like single characters.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Rich Media</h3>
            <p>
              Supports images (via URL) and Tables. Tables are fully editable cells inserted directly into the document flow.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
};

export default App;