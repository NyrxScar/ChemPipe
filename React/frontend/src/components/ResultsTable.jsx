import { useState } from 'react';
import { Search, Download, ShieldCheck, Activity } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ResultsTable({ data }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!data || data.length === 0) {
    return (
      <div className="glass-panel text-center p-12 flex flex-col items-center justify-center">
        <Activity className="w-12 h-12 text-primary opacity-50 mb-4" />
        <p className="font-mono text-primary uppercase tracking-widest text-glow-primary">Sem dados na base atual</p>
      </div>
    );
  }

  const filteredData = data.filter(row => 
    row['Composto']?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    row['Fórmula']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row['Categoria química']?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPubchemImageUrl = (cid) => {
    if (!cid || cid === 'Não localizado') return null;
    return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG`;
  };

  const handleDownload = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultados");
    XLSX.writeFile(wb, "Analise_ChemPipe.xlsx");
  };

  return (
    <div className="space-y-6">
      {/* Table Toolbar */}
      <div className="glass-panel p-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/5 shadow-lg">
        <div className="relative flex-1 min-w-[300px] max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="Pesquisar composto, fórmula..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 focus:border-primary/30 focus:bg-white/10 rounded-xl px-11 py-3 text-sm text-white transition-all outline-none placeholder:text-text-muted/50 shadow-sm"
          />
        </div>
        
        <button 
          onClick={handleDownload}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-primary/20 hover:bg-primary-hover hover:scale-[1.02] active:scale-95"
        >
          <Download className="w-4 h-4" />
          Exportar Planilha
        </button>
      </div>

      {/* Main Table */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-text-muted border-b border-white/10 text-xs font-semibold tracking-wide">
              <tr>
                <th className="px-6 py-5 w-32">Estrutura 2D</th>
                <th className="px-6 py-5">Identificação</th>
                <th className="px-6 py-5">Variáveis Bio</th>
                <th className="px-6 py-5">Categoria</th>
                <th className="px-6 py-5 text-right">Score Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((row, idx) => {
                let cid = row['ID'] || null;
                const imgUrl = getPubchemImageUrl(cid);
                
                return (
                  <tr key={idx} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      {imgUrl ? (
                        <div className="w-24 h-24 bg-white/5 rounded-xl border border-white/10 p-2 flex items-center justify-center relative overflow-hidden group-hover:border-primary/30 transition-all">
                          <img src={imgUrl} alt={row['Composto']} className="max-w-full max-h-full object-contain filter invert opacity-90 mix-blend-screen" loading="lazy" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-text-muted/50 text-[10px] text-center p-2">
                          <span>SEM IMAGEM</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white text-base mb-1 group-hover:text-primary transition-colors">{row['Composto']}</div>
                      <div className="text-text-muted flex flex-col gap-0.5 text-xs">
                        <span>Fórmula: <span className="text-white/70">{row['Fórmula']}</span></span>
                        <span>Massa: <span className="text-white/70">{Number(row['Massa'] || 0).toFixed(4)}</span></span>
                      </div>
                      {row['ID'] && <div className="text-[10px] text-primary/60 mt-3 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> CID_{row['ID']}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${row['Ionização'] === 'Neutra' ? 'bg-white/5 text-text-muted' : 'bg-primary/10 text-primary'}`}>
                            {row['Ionização']}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-warning/10 text-warning">
                            {row['Metabolismo']}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2 text-xs">
                        {row['Categoria química'] && row['Categoria química'] !== 'Não categorizado' && (
                          <div className="inline-block px-2 py-1 bg-white/5 text-text-muted border border-white/10 rounded-md">
                            {row['Categoria química'].split(' | ')[0]}
                          </div>
                        )}
                        
                        {row['Vias metabólicas'] && row['Vias metabólicas'] !== 'Desconhecida' && (
                          <div className="block">
                            <span className="inline-block px-2 py-1 bg-success/10 text-success rounded-md text-[10px] font-bold uppercase">
                              VIAS ({row['Vias metabólicas'].split(' | ').length})
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-3xl font-bold text-white">
                          {Number(row['Score Compatibilidade'] || 0).toFixed(2)}
                        </span>
                        <div className="text-[10px] text-text-muted mt-1 uppercase tracking-wider font-semibold">
                          Score Base: {Number(row['Score Base'] || 0).toFixed(1)}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
