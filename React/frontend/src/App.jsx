import { useState } from 'react';
import axios from 'axios';
import { UploadCloud, Beaker, History, ChevronRight, Activity } from 'lucide-react';
import UploadView from './components/UploadView';
import ResultsTable from './components/ResultsTable';
import HistoryView from './components/HistoryView';

// Use environment variable or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
axios.defaults.baseURL = API_URL;

function App() {
  const [currentView, setCurrentView] = useState('upload'); // upload, results, history
  const [resultsData, setResultsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (idFile, abundFile, topN) => {
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('f_id', idFile);
    formData.append('f_abund', abundFile);
    formData.append('top_n', topN);

    try {
      const response = await axios.post('/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResultsData(response.data.data);
      setCurrentView('results');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Erro Crítico: Falha ao processar dados nas APIs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative">

      {/* HUD Header */}
      <header className="glass-panel border-b border-border sticky top-0 z-50 shadow-neon-primary/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center px-6 py-4">
          <div className="flex flex-col items-center sm:items-start justify-center">
            <div className="flex flex-col items-center w-fit group cursor-pointer">
              <img src="/ChemPipe.png" alt="ChemPipe Logo" className="h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
              <div className="flex items-center gap-2 mt-1 opacity-80">
                <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                <p className="text-[9px] uppercase tracking-[0.2em] text-success font-medium font-sans">Sistema de Análise Ativo</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-2 p-1.5">
            <button 
              onClick={() => setCurrentView('upload')}
              className={`px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                currentView === 'upload' 
                  ? 'text-white bg-primary shadow-lg shadow-primary/20' 
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              Nova Operação
            </button>
 
            <button 
              onClick={() => setCurrentView('history')}
              className={`px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                currentView === 'history' 
                  ? 'text-white bg-success shadow-lg shadow-success/20' 
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Logs
            </button>
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full relative z-10">
        {currentView === 'upload' && (
          <UploadView onUpload={handleUpload} loading={loading} error={error} />
        )}

        {currentView === 'results' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center gap-3 mb-6 bg-background/60 inline-flex px-4 py-2 rounded-lg border border-border">
              <button onClick={() => setCurrentView('upload')} className="text-text-muted hover:text-primary transition-colors text-xs uppercase tracking-wider font-mono">
                [ Retornar ]
              </button>
              <ChevronRight className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono uppercase tracking-widest text-primary text-glow-primary">Extração de Dados Concluída</span>
            </div>
            <ResultsTable data={resultsData} />
          </div>
        )}

        {currentView === 'history' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 bg-success shadow-[0_0_10px_#7ed957]"></div>
              <h2 className="text-2xl font-mono uppercase tracking-widest text-white">Bancos de Dados Locais</h2>
            </div>
            <HistoryView onViewResults={(data) => {
              setResultsData(data);
              setCurrentView('results');
            }} />
          </div>
        )}
      </main>

    </div>
  );
}

export default App;
