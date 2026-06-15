import { useState } from 'react';
import { UploadCloud, Database, CheckCircle, AlertTriangle, Loader2, ScanLine } from 'lucide-react';

export default function UploadView({ onUpload, loading, error }) {
  const [idFile, setIdFile] = useState(null);
  const [abundFile, setAbundFile] = useState(null);
  const [topN, setTopN] = useState(100);

  const handleDragOver = (e) => e.preventDefault();
  
  const handleDrop = (e, setter) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setter(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 mt-10">
      
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-primary/5 border border-primary/20 shadow-xl mb-4">
          <ScanLine className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-white">Scanner de Espectrometria</h2>
        <p className="text-text-muted max-w-xl mx-auto text-base">Insira os pacotes de dados (.xlsx) para iniciar a mineração cruzada em redes biológicas.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 relative">
        {/* Connection line between dropzones */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-px bg-primary/30 hidden md:block"></div>

        {/* Dropzone ID */}
        <div 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, setIdFile)}
          className={`glass-panel rounded-2xl p-10 text-center transition-all duration-300 border-2 ${
            idFile 
              ? 'border-success/50 bg-success/5' 
              : 'border-white/5 hover:border-primary/40 hover:bg-white/5'
          } flex flex-col items-center justify-center min-h-[240px] cursor-pointer relative overflow-hidden group shadow-lg`}
        >
          {/* Scanning line animation */}
          {!idFile && <div className="absolute top-0 left-0 w-full h-1 bg-primary/40 opacity-0 group-hover:animate-[scan_2s_ease-in-out_infinite]"></div>}
          
          <input 
            type="file" 
            accept=".xlsx" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            onChange={(e) => setIdFile(e.target.files[0])}
          />
          {idFile ? (
            <div className="space-y-3 z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-success blur-md opacity-40 rounded-full"></div>
                <CheckCircle className="w-14 h-14 text-success mx-auto relative z-10" />
              </div>
              <p className="font-mono font-bold text-success text-glow-success uppercase tracking-wider">{idFile.name}</p>
              <p className="text-xs font-mono text-success/70">[ IDENTIFICAÇÃO CONFIRMADA ]</p>
            </div>
          ) : (
            <div className="space-y-4 z-10">
              <Database className="w-10 h-10 text-primary mx-auto opacity-70 group-hover:opacity-100 transition-opacity" />
              <div>
                <p className="font-semibold text-white tracking-wide mb-1">Dados de Identificação</p>
                <p className="text-sm text-text-muted">Arraste ou clique para enviar</p>
              </div>
            </div>
          )}
        </div>

        {/* Dropzone Abund */}
        <div 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, setAbundFile)}
          className={`glass-panel rounded-2xl p-10 text-center transition-all duration-300 border-2 ${
            abundFile 
              ? 'border-success/50 bg-success/5' 
              : 'border-white/5 hover:border-primary/40 hover:bg-white/5'
          } flex flex-col items-center justify-center min-h-[240px] cursor-pointer relative overflow-hidden group shadow-lg`}
        >
          {/* Scanning line animation */}
          {!abundFile && <div className="absolute top-0 left-0 w-full h-1 bg-primary/40 opacity-0 group-hover:animate-[scan_2s_ease-in-out_infinite]"></div>}

          <input 
            type="file" 
            accept=".xlsx" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            onChange={(e) => setAbundFile(e.target.files[0])}
          />
          {abundFile ? (
            <div className="space-y-3 z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-success blur-md opacity-40 rounded-full"></div>
                <CheckCircle className="w-14 h-14 text-success mx-auto relative z-10" />
              </div>
              <p className="font-mono font-bold text-success text-glow-success uppercase tracking-wider">{abundFile.name}</p>
              <p className="text-xs font-mono text-success/70">[ ABUNDÂNCIA CONFIRMADA ]</p>
            </div>
          ) : (
            <div className="space-y-4 z-10">
              <Database className="w-10 h-10 text-primary mx-auto opacity-70 group-hover:opacity-100 transition-opacity" />
              <div>
                <p className="font-mono font-bold text-white uppercase tracking-wider mb-1">Dados de Abundância</p>
                <p className="text-xs font-mono text-text-muted">Aguardando arquivo .xlsx</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger shadow-[0_0_15px_rgba(239,68,68,0.2)] rounded-lg p-4 flex items-center gap-3 text-red-200 animate-pulse">
          <AlertTriangle className="w-6 h-6 text-danger flex-shrink-0" />
          <p className="font-mono text-sm">{error}</p>
        </div>
      )}

      <div className="glass-panel p-6 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle grid in panel */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgyMHYyMEgxek0wIDBoMjB2MjBIMHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSg1NiwgMTgyLCAyNTUsIDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] opacity-30"></div>
        
        <div className="space-y-2 relative z-10 w-full sm:w-auto">
          <label className="text-xs font-mono uppercase tracking-widest text-primary block">Limite de Extração (Top N)</label>
          <div className="flex items-center gap-3">
            <input 
              type="number" 
              min="10" 
              max="500" 
              value={topN} 
              onChange={(e) => setTopN(parseInt(e.target.value))}
              className="block w-24 bg-background border border-primary/50 rounded text-primary font-mono text-xl px-3 py-2 focus:outline-none focus:border-primary focus:shadow-neon-primary transition-all text-center"
            />
            <span className="text-xs font-mono text-text-muted">Compostos</span>
          </div>
        </div>
        
        <button
          onClick={() => onUpload(idFile, abundFile, topN)}
          disabled={!idFile || !abundFile || loading}
          className={`relative z-10 flex w-full sm:w-auto justify-center items-center gap-3 px-10 py-4 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 overflow-hidden group ${
            !idFile || !abundFile 
              ? 'bg-white/5 border border-white/10 text-text-muted cursor-not-allowed' 
              : loading 
                ? 'bg-primary text-white cursor-wait' 
                : 'bg-primary text-white hover:bg-primary-hover shadow-xl shadow-primary/20'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sintetizando Dados...
            </>
          ) : (
            <>
              <UploadCloud className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
              Executar Análise
            </>
          )}
          {/* Button shine effect */}
          {(!loading && idFile && abundFile) && (
            <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-[shine_1.5s]"></div>
          )}
        </button>
      </div>
    </div>
  );
}
