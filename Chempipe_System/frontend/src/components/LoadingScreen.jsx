import { useState, useEffect } from 'react';
import { Cpu, Dna } from 'lucide-react';

export default function LoadingScreen({ progress, currentCompound, completed, total }) {
  const [logs, setLogs] = useState([]);

  // Add the current compound to a scrolling terminal log
  useEffect(() => {
    if (currentCompound) {
      const timer = setTimeout(() => {
        setLogs((prev) => {
          const timeString = new Date().toLocaleTimeString('pt-BR', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          
          if (prev.length > 0 && prev[0].compound === currentCompound) {
            return prev;
          }

          const newLog = {
            time: timeString,
            compound: currentCompound,
            id: Math.random().toString(),
            type: Math.random() > 0.5 ? 'PUBCHEM' : Math.random() > 0.5 ? 'CHEBI' : 'KEGG'
          };
          return [newLog, ...prev].slice(0, 4);
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentCompound]);

  // Determine stage description based on progress
  let stageDescription = 'Preparando cruzamento de matrizes...';
  if (progress > 5 && progress <= 20) {
    stageDescription = 'Conectando aos servidores biológicos (PubChem, ChEBI, KEGG)...';
  } else if (progress > 20 && progress <= 85) {
    stageDescription = `Minerando dados estruturais e ontológicos...`;
  } else if (progress > 85 && progress <= 95) {
    stageDescription = 'Synthesizing scores e estimando ionização/metabolismo...';
  } else if (progress > 95) {
    stageDescription = 'Concluindo transações locais e montando visualização...';
  }

  return (
    <div className="max-w-xl mx-auto glass-panel border border-primary/20 rounded-2xl p-8 space-y-8 animate-in fade-in zoom-in-95 duration-500 mt-20 relative overflow-hidden shadow-neon-primary/20">
      
      {/* Background grids and glowing elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgyMHYyMEgxek0wIDBoMjB2MjBIMHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSg1NiwgMTgyLCAyNTUsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLzPjwvc3ZnPg==')] opacity-40"></div>
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-success/10 rounded-full blur-3xl"></div>

      {/* Main scanning molecular visualization */}
      <div className="flex justify-center relative z-10">
        <div className="relative flex items-center justify-center w-28 h-28">
          {/* Pulsing ring */}
          <div className="absolute inset-0 border border-primary/30 rounded-full animate-ping opacity-25"></div>
          {/* Rotating complex scanner ring */}
          <div className="absolute inset-1 border-2 border-dashed border-primary/40 rounded-full animate-[spin_20s_linear_infinite]"></div>
          <div className="absolute inset-3 border border-success/40 rounded-full animate-[spin_10s_linear_infinite_reverse]"></div>
          
          <div className="glass-panel w-20 h-20 rounded-full flex items-center justify-center border-white/10 relative shadow-[inset_0_0_15px_rgba(56,182,255,0.2)]">
            <Dna className="w-9 h-9 text-primary animate-pulse" />
          </div>
        </div>
      </div>

      <div className="text-center space-y-2 relative z-10">
        <h3 className="text-lg font-semibold tracking-wider font-sans uppercase text-glow-primary text-primary">Sintetizando Rede Metabólica</h3>
        <p className="text-xs font-mono text-text-muted h-5 overflow-hidden text-ellipsis">{stageDescription}</p>
      </div>

      {/* Loading Progress Bar */}
      <div className="space-y-3 relative z-10">
        <div className="flex justify-between items-end font-mono text-xs">
          <span className="text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-primary animate-spin" /> 
            Progresso: {completed} / {total}
          </span>
          <span className="text-primary font-bold text-glow-primary text-base">{progress}%</span>
        </div>
        
        {/* Glowing progress track */}
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 rounded-full shadow-[0_0_10px_#38b6ff]"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Terminal Real-time Log */}
      <div className="glass-panel bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-xs text-left space-y-2 relative z-10 shadow-inner">
        <div className="flex justify-between border-b border-white/5 pb-1.5 text-text-muted tracking-wider text-[10px]">
          <span>CONEXÃO COM APIS DO PROJETO</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping"></span>
            LIVE STREAM
          </span>
        </div>
        
        <div className="h-[96px] space-y-2 overflow-y-hidden select-none">
          {logs.length === 0 ? (
            <div className="text-text-muted/40 h-full flex items-center justify-center italic text-center pt-2">
              Aguardando pacotes biológicos...
            </div>
          ) : (
            logs.map((log) => (
              <div 
                key={log.id} 
                className="flex items-start gap-2 animate-in slide-in-from-top-2 duration-300"
              >
                <span className="text-primary/70">{log.time}</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] bg-white/5 border border-white/10 text-success font-semibold tracking-wide scale-90">
                  {log.type}
                </span>
                <span className="text-white font-mono break-all line-clamp-1 flex-1">
                  Minerando composto: <span className="text-glow-primary text-primary">{log.compound}</span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
