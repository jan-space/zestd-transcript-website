
import React, { useState, useCallback } from 'react';
import { LANGUAGES } from './constants.ts';
import { ExtractionState } from './types.ts';
import { extractVideoId, fetchYouTubeTranscript } from './services/youtubeService.ts';
import { getGeminiSummary } from './services/geminiService.ts';
import TerminalPanel from './components/TerminalPanel.tsx';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<ExtractionState>({
    status: 'idle',
    videoId: null,
    logs: [],
    transcript: [],
  });
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleExtract = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const vid = extractVideoId(url);
    if (!vid) {
      alert("Please provide a valid YouTube URL.");
      return;
    }

    setAiSummary(null);
    setIsSummarizing(false);
    setState({
      status: 'loading',
      videoId: vid,
      logs: [],
      transcript: [],
    });

    try {
      const fullTranscript = await fetchYouTubeTranscript(vid);
      
      if (fullTranscript.length === 0) {
        throw new Error("No transcript data found. This video may not have captions.");
      }

      setState(prev => ({ ...prev, status: 'processing' }));

      // Simulate a rapid terminal-style reveal for aesthetic effect
      const batchSize = Math.ceil(fullTranscript.length / 15);
      for (let i = 0; i < fullTranscript.length; i += batchSize) {
        const nextBatch = fullTranscript.slice(i, i + batchSize);
        await new Promise(r => setTimeout(r, 80));
        setState(prev => ({
          ...prev,
          transcript: [...prev.transcript, ...nextBatch],
        }));
      }

      setState(prev => ({
        ...prev,
        status: 'completed',
        transcript: fullTranscript
      }));

      // Trigger AI Summary automatically
      setIsSummarizing(true);
      const summary = await getGeminiSummary(fullTranscript);
      setAiSummary(summary);
      setIsSummarizing(false);

    } catch (err: any) {
      console.error(err);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message || 'Failed to extract transcript.',
      }));
    }
  }, [url]);

  return (
    <div className="flex h-full grow flex-col">
      <header className="sticky top-0 z-50 w-full bg-background-dark/60 backdrop-blur-xl border-b border-white/[0.03] px-6 lg:px-20 py-4">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(255,51,0,0.3)]">
              <span className="material-symbols-outlined text-white text-xl font-bold">code</span>
            </div>
            <div>
              <h2 className="text-white text-lg font-bold tracking-tight leading-none">Zestd</h2>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <nav className="hidden lg:flex items-center gap-8">
              <a className="text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-primary transition-colors cursor-pointer">Protocol</a>
              <a className="text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-primary transition-colors cursor-pointer">Docs</a>
              <a className="text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-primary transition-colors cursor-pointer">Security</a>
            </nav>
            <button className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all">
              API Access
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        <section className="w-full max-w-[840px] px-6 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-bold mb-10 tracking-widest uppercase animate-pulse">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Real-time Parser Online
          </div>
          
          <h1 className="text-white text-5xl md:text-7xl font-bold tracking-tighter mb-10 leading-[0.9]">
            Instant YouTube <br/>
            <span className="text-primary">Transcripts</span>
          </h1>

          <form onSubmit={handleExtract} className="technical-panel p-1.5 rounded-2xl max-w-2xl mx-auto mb-6 flex items-center gap-1.5">
              <div className="relative flex-1">
                <input 
                  className="w-full h-16 bg-transparent border-none rounded-xl px-6 text-white placeholder:text-gray-600 focus:ring-0 outline-none text-lg font-medium" 
                  placeholder="Insert video link..." 
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                disabled={state.status === 'loading' || state.status === 'processing'}
                className="bg-primary hover:bg-[#E62E00] disabled:bg-white/5 disabled:text-gray-500 h-16 px-10 rounded-xl text-white font-bold flex items-center justify-center gap-3 transition-all shadow-[0_4px_24px_rgba(255,51,0,0.2)] active:scale-95"
              >
                <span className={`material-symbols-outlined ${state.status === 'processing' ? 'animate-spin' : ''}`}>
                  {state.status === 'processing' ? 'sync' : 'bolt'}
                </span>
                {state.status === 'processing' ? 'Parsing...' : 'Extract'}
              </button>
          </form>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-[0.2em]">Supported: Youtube / Shorts / Live / Embeds</p>
        </section>

        <TerminalPanel state={state} />

        {(aiSummary || isSummarizing) && (
          <section className="w-full max-w-[800px] px-6 mb-32">
             <div className="technical-panel p-8 rounded-2xl border-primary/30 bg-primary/[0.02] terminal-glow overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4">
                   <div className="text-[10px] font-mono text-primary/20 uppercase tracking-[0.4em]">Gemini 3 Flash</div>
                </div>
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-xl">psychology</span>
                    </div>
                    <div>
                      <h3 className="text-white font-bold tracking-tight">AI Content Synopsis</h3>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Semantic Analysis Active</p>
                    </div>
                </div>
                
                {isSummarizing ? (
                  <div className="space-y-4">
                    <div className="h-4 w-full bg-white/5 animate-pulse rounded"></div>
                    <div className="h-4 w-3/4 bg-white/5 animate-pulse rounded"></div>
                    <div className="h-4 w-5/6 bg-white/5 animate-pulse rounded"></div>
                  </div>
                ) : (
                  <div className="text-gray-300 text-sm leading-relaxed prose prose-invert max-w-none">
                      {aiSummary}
                  </div>
                )}
             </div>
          </section>
        )}

        <section className="w-full max-w-[1200px] px-6 py-32 border-t border-white/[0.03]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="group">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                <span className="material-symbols-outlined text-gray-400 group-hover:text-primary">api</span>
              </div>
              <h4 className="text-white font-bold mb-3 tracking-tight">Internal Scraper</h4>
              <p className="text-gray-500 text-sm leading-relaxed">Directly accesses YouTube's TimedText metadata, ensuring zero dependency on 3rd party API quotas.</p>
            </div>
            <div className="group">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                <span className="material-symbols-outlined text-gray-400 group-hover:text-primary">auto_awesome</span>
              </div>
              <h4 className="text-white font-bold mb-3 tracking-tight">AI Summarization</h4>
              <p className="text-gray-500 text-sm leading-relaxed">Leverages Gemini 3 Flash to compress long-form content into concise technical highlights instantly.</p>
            </div>
            <div className="group">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                <span className="material-symbols-outlined text-gray-400 group-hover:text-primary">verified_user</span>
              </div>
              <h4 className="text-white font-bold mb-3 tracking-tight">Privacy First</h4>
              <p className="text-gray-500 text-sm leading-relaxed">All processing happens in-browser or via stateless secure proxies. No data is stored or logged.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-white/[0.03] py-12 px-6 bg-background-dark">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6 opacity-40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">lock</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Secure Socket</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">database</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Stateless</span>
            </div>
          </div>
          
          <div className="flex gap-10 text-[11px] font-bold uppercase tracking-widest text-gray-500">
            <a className="hover:text-primary transition-colors cursor-pointer">Protocol</a>
            <a className="hover:text-primary transition-colors cursor-pointer">Compliance</a>
            <a className="hover:text-primary transition-colors cursor-pointer">Log</a>
          </div>
          
          <div className="text-[10px] font-mono text-gray-700">
            © {new Date().getFullYear()} ZESTD.IO // ALL RIGHTS RESERVED
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
