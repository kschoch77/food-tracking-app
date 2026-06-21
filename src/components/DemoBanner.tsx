'use client';

import React, { useState } from 'react';
import { Database, AlertTriangle, X, HelpCircle, Code } from 'lucide-react';

export default function DemoBanner() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full bg-slate-900 border-b border-dark-border text-xs z-50">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-orange-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Running in <strong className="font-semibold text-slate-100">Offline Demo Mode</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(true)}
            className="text-slate-400 hover:text-slate-200 underline font-medium cursor-pointer"
          >
            Setup Supabase
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-dark-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-100">
                <Database className="w-5 h-5 text-emerald-500" />
                <span>Supabase Connection Guide</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-slate-300 text-sm max-h-[70vh] overflow-y-auto no-scrollbar">
              <p>
                Currently, the app is running in Offline Demo Mode. All your logs, foods, and targets are saved in the browser's <strong>localStorage</strong>.
              </p>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <span className="bg-emerald-500/20 text-emerald-400 rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                  Create Supabase Project
                </h4>
                <p className="pl-6 text-xs text-slate-400">
                  Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">supabase.com</a>, create a free project, and copy your API Keys.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <span className="bg-emerald-500/20 text-emerald-400 rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                  Run schema.sql
                </h4>
                <p className="pl-6 text-xs text-slate-400">
                  Open the <strong>SQL Editor</strong> in your Supabase dashboard and run the entire query inside the local <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">schema.sql</code> file.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <span className="bg-emerald-500/20 text-emerald-400 rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                  Configure .env.local
                </h4>
                <p className="pl-6 text-xs text-slate-400">
                  Duplicate <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">.env.local.example</code> to <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">.env.local</code> and paste your keys:
                </p>
                <pre className="ml-6 p-2 bg-slate-950 rounded text-slate-400 text-xxs font-mono overflow-x-auto border border-dark-border">
                  NEXT_PUBLIC_SUPABASE_URL=your_project_url{"\n"}
                  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
                </pre>
              </div>

              <div className="space-y-2 pt-2 text-xs border-t border-dark-border/50 text-slate-400">
                <p className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  No database connection is required for Demo Mode! You can continue testing immediately.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-dark-border flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition"
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
