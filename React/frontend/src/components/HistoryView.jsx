import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Server, DatabaseZap, TerminalSquare } from 'lucide-react';

export default function HistoryView({ onViewResults }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get('/api/history');
      setHistory(response.data);
    } catch (err) {
      setError('ERRO CRÍTICO: Falha de conexão com os servidores de log.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadAnalysis = async (id) => {
    setLoadingId(id);
    try {
      const response = await axios.get(`/api/history/${id}`);
      
      const mappedData = response.data.map(row => ({
        'Composto': row.composto,
        'Description': row.descricao,
        'Fórmula': row.formula,
        'Massa': row.massa,
        'm/z': row.m_z,
        'Score Base': row.score_base,
        'Bonus Biologico': row.score_biologico,
        'Score Compatibilidade': row.score_total,
        'IUPAC': row.iupac,
        'Ionização': row.ionizacao,
        'Categoria química': row.categoria_quimica,
        'Metabolismo': row.metabolismo,
        'Vias metabólicas': row.vias,
        'ID': row.cid,
      }));
      
      onViewResults(mappedData);
    } catch (err) {
      alert('Falha ao restaurar dados deste buffer.');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel text-center p-16 flex flex-col items-center justify-center rounded-3xl">
        <Activity className="w-10 h-10 text-primary opacity-30 mb-4" />
        <p className="text-text-muted font-medium">Nenhum dado encontrado para exibição</p>
      </div>
    );
  }

  if (error) {
    return <div className="font-mono text-danger text-center py-10 uppercase tracking-widest bg-danger/10 border border-danger p-6 rounded">{error}</div>;
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-24 glass-panel rounded-3xl border border-white/5">
        <Server className="w-12 h-12 text-text-muted/30 mx-auto mb-6" />
        <p className="text-text-muted font-medium">Nenhum histórico de análise encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {history.map((item) => (
        <div key={item.id} className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-primary/40 transition-all duration-500 flex flex-col shadow-lg">
          <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <TerminalSquare className="w-4 h-4 text-primary/70" />
              <div className="text-white/90 font-semibold text-xs tracking-wider uppercase">
                ID: {item.id.toString().padStart(4, '0')}
              </div>
            </div>
            <div className="text-[10px] text-text-muted bg-white/5 px-2 py-1 rounded-md">
              {item.data_hora}
            </div>
          </div>
          
          <div className="flex flex-col gap-3 mb-6 flex-1">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group-hover:border-primary/10 transition-all">
              <DatabaseZap className="w-4 h-4 text-primary/60 shrink-0" />
              <div className="text-sm truncate w-full" title={item.nome_arquivo_identificacao}>
                <span className="text-[10px] text-text-muted block uppercase tracking-tight mb-0.5">Identificação</span>
                <span className="text-white/80 group-hover:text-white transition-colors">{item.nome_arquivo_identificacao}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group-hover:border-success/10 transition-all">
              <DatabaseZap className="w-4 h-4 text-success/60 shrink-0" />
              <div className="text-sm truncate w-full" title={item.nome_arquivo_abundancia}>
                <span className="text-[10px] text-text-muted block uppercase tracking-tight mb-0.5">Abundância</span>
                <span className="text-white/80 group-hover:text-white transition-colors">{item.nome_arquivo_abundancia}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => handleLoadAnalysis(item.id)}
            disabled={loadingId === item.id}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.02] active:scale-95"
          >
            {loadingId === item.id ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando...
              </>
            ) : (
              'Visualizar Resultados'
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
