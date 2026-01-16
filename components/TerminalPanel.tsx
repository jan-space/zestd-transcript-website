
import React, { useEffect, useRef } from 'react';
import { ExtractionState, TranscriptItem } from '../types.ts';

interface TerminalPanelProps {
  state: ExtractionState;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ state }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.transcript]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadTranscript = () => {
    if (state.status !== 'completed' || !state.transcript.length) return;
    
    const textContent = `YouTube Video Transcript\nVideo ID: ${state.videoId}\nGenerated: ${new Date().toLocaleString()}\n\n` +
      state.transcript.map(t => `[${formatTime(t.startTime)}] ${t.text}`).join('\n');
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${state.videoId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (state.status !== 'completed' || !state.transcript.length) return;
    const text = state.transcript.map(t => `[${formatTime(t.startTime)}] ${t.text}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <section className="w-full max-w-[1000px] px-6 mb-16 mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
           <span className="material-symbols-outlined text-primary text-sm">terminal</span>
           <span className="text-[10px] font-bold tracking-[0.3em] text-white uppercase opacity-60">Transcript Output</span>
        </div>
        <div className="flex gap-2">
            {state.videoId && (
              <div className="px-2 py-0.5 rounded border border-white/5 bg-white/5 text-[9px] font-mono text-gray-400">
                ID: {state.videoId}
              </div>
            )}
            <div className={`px-2 py-0.5 rounded border border-primary/20 bg-primary/5 text-[9px] font-mono text-primary uppercase font-bold`}>
              {state.status}
            </div>
        </div>
      </div>

      <div className="technical-panel rounded-xl overflow-hidden min-h-[500px] flex flex-col border border-primary/20 terminal-glow">
        <div className="bg-[#1a222c] border-b border-white/5 px-6 py-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
          </div>
          
          <div className="flex gap-4">
            <button 
                title="Copy Transcript"
                disabled={state.status !== 'completed'}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${state.status === 'completed' ? 'text-gray-400 hover:text-white cursor-pointer' : 'text-gray-600 cursor-not-allowed'}`}
                onClick={copyToClipboard}
            >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                Copy
            </button>
            <button 
                title="Download .txt"
                disabled={state.status !== 'completed'}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${state.status === 'completed' ? 'text-primary hover:text-white cursor-pointer' : 'text-gray-600 cursor-not-allowed'}`}
                onClick={downloadTranscript}
            >
                <span className="material-symbols-outlined text-sm">download</span>
                Export
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="scanlines flex-1 p-8 font-mono text-[13px] leading-relaxed overflow-y-auto max-h-[600px] scroll-smooth">
          {state.status === 'idle' ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="w-16 h-16 rounded-full border border-primary/20 flex items-center justify-center mb-6 bg-primary/5">
                <span className="material-symbols-outlined text-primary text-3xl">cloud_download</span>
              </div>
              <h3 className="text-white text-lg font-bold mb-2">Initialize Extraction Sequence</h3>
              <p className="text-gray-500 text-xs max-w-sm mx-auto leading-loose">
                Awaiting target URL. Paste a valid YouTube link into the vector field above to begin deep-packet transcript retrieval.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {state.transcript.map((item, i) => (
                <div key={`line-${i}`} className="group flex gap-6 hover:bg-white/5 -mx-4 px-4 py-1 rounded transition-colors">
                  <span className="text-primary/60 font-medium tabular-nums shrink-0 select-none w-12 text-right">
                    {formatTime(item.startTime)}
                  </span>
                  <span className="text-gray-300">
                    {item.text}
                  </span>
                </div>
              ))}

              {(state.status === 'loading' || state.status === 'processing') && (
                <div className="flex gap-6 items-center py-2">
                  <span className="text-primary/30 tabular-nums shrink-0 w-12 text-right">--:--</span>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold uppercase text-[10px] tracking-widest">Streaming Data...</span>
                    <span className="w-1.5 h-4 bg-primary cursor-blink"></span>
                  </div>
                </div>
              )}

              {state.status === 'error' && (
                <div className="p-6 rounded border border-red-500/20 bg-red-500/5 text-red-500 text-xs mt-4">
                  <div className="font-bold flex items-center gap-2 mb-2 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-sm">error</span>
                    Extraction Failed
                  </div>
                  <div className="opacity-80 leading-relaxed">{state.error}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TerminalPanel;
