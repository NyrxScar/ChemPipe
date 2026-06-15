import { useState, useEffect } from 'react';
import { Search, Download, ShieldCheck, Activity, X, ExternalLink, Copy, Check, Info, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';

function CompoundDetailModal({ compound, onClose }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, safety, uses, ontology

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyIupac = () => {
    if (compound.IUPAC) {
      navigator.clipboard.writeText(compound.IUPAC);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isCidValido = (cid) => {
    if (!cid) return false;
    const strCid = String(cid).trim().toLowerCase();
    return strCid !== '' && strCid !== 'não localizado' && strCid !== 'none' && strCid !== 'nan' && strCid !== 'null' && strCid !== 'undefined';
  };

  const imgUrl = isCidValido(compound.ID)
    ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.ID}/PNG`
    : null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-background/95 border border-white/10 rounded-2xl overflow-y-auto glass-panel shadow-neon-primary animate-in zoom-in-95 duration-300 flex flex-col md:flex-row z-[9999]">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all text-text-muted hover:text-white z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Column: Image Structure */}
        <div className="w-full md:w-1/3 bg-white/2 flex flex-col items-center justify-start p-8 border-b md:border-b-0 md:border-r border-white/5 min-h-[300px] pt-12">
          {imgUrl ? (
            <div className="w-full max-w-[240px] aspect-square bg-white rounded-2xl border border-white/15 p-4 flex items-center justify-center shadow-lg relative overflow-hidden group">
              <img
                src={imgUrl}
                alt={compound.Composto}
                className="max-w-full max-h-full object-contain filter invert"
              />
            </div>
          ) : (
            <div className="w-full max-w-[200px] aspect-square bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-text-muted text-xs text-center p-4">
              <ShieldCheck className="w-10 h-10 text-text-muted/40 mb-2 animate-pulse" />
              <span>Sem estrutura molecular disponível</span>
            </div>
          )}

          {compound.ID && (
            <a
              href={`https://pubchem.ncbi.nlm.nih.gov/compound/${compound.ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary/20 text-primary font-mono text-xs rounded-xl hover:bg-primary/20 hover:scale-[1.02] transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              VER NO PUBCHEM
            </a>
          )}
        </div>

        {/* Right Column: Full Details */}
        <div className="flex-1 p-8 space-y-6 overflow-y-auto">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary text-glow-primary block mb-1">DETALHES DO COMPOSTO</span>
            <h2 className="text-3xl font-semibold text-white tracking-tight">
              {compound.Nome_Facil || compound.Composto}
            </h2>
            {compound.Nome_Facil && compound.Nome_Facil !== compound.Composto && (
              <p className="text-text-muted/65 text-xs italic mt-1 font-mono max-w-lg break-words">
                Nome sistemático: {compound.Composto}
              </p>
            )}
            {isCidValido(compound.ID) && (
              <p className="font-mono text-xs text-text-muted mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                PubChem CID: <span className="text-white">{compound.ID}</span>
              </p>
            )}
          </div>

          {/* Tabbed Menu HUD */}
          <div className="flex border-b border-white/10 gap-1 pb-px overflow-x-auto scrollbar-none font-mono text-[10px] sm:text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 sm:px-4 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${activeTab === 'overview' ? 'border-primary text-primary text-glow-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-white'}`}
            >
              <Info className="w-3.5 h-3.5" /> Geral
            </button>
            <button
              onClick={() => setActiveTab('safety')}
              className={`px-3 sm:px-4 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${activeTab === 'safety' ? 'border-danger text-danger text-glow-danger bg-danger/5' : 'border-transparent text-text-muted hover:text-white'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-danger" /> Segurança & Toxicidade
            </button>
            <button
              onClick={() => setActiveTab('uses')}
              className={`px-3 sm:px-4 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${activeTab === 'uses' ? 'border-warning text-warning text-glow-warning bg-warning/5' : 'border-transparent text-text-muted hover:text-white'}`}
            >
              <Activity className="w-3.5 h-3.5 text-warning" /> Aplicações & Aditivos
            </button>
            <button
              onClick={() => setActiveTab('ontology')}
              className={`px-3 sm:px-4 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${activeTab === 'ontology' ? 'border-success text-success text-glow-success bg-success/5' : 'border-transparent text-text-muted hover:text-white'}`}
            >
              <Layers className="w-3.5 h-3.5 text-success" /> Ontologia & Registros
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-0.5">Fórmula Molecular</p>
                  <p className="text-lg font-bold text-white tracking-wide">{compound.Fórmula || 'Não localizado'}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-0.5">Massa Molecular</p>
                  <p className="text-lg font-bold text-white tracking-wide">
                    {compound.Massa && compound.Massa !== 0 ? `${Number(compound.Massa).toFixed(4)} u` : 'Não localizado'}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-0.5">m/z (Massa/Carga)</p>
                  <p className="text-lg font-bold text-white tracking-wide">
                    {compound['m/z'] ? Number(compound['m/z']).toFixed(4) : '0.0000'}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-0.5">Tempo de Retenção</p>
                  <p className="text-lg font-bold text-white tracking-wide">
                    {compound['Retention time (min)'] ? `${Number(compound['Retention time (min)']).toFixed(2)} min` : '0.00 min'}
                  </p>
                </div>
              </div>

              {/* IUPAC */}
              {compound.IUPAC && compound.IUPAC !== 'Não localizado' && (
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Nomenclatura IUPAC</span>
                    <button
                      onClick={handleCopyIupac}
                      className="flex items-center gap-1.5 text-[10px] font-mono text-primary hover:text-primary-hover cursor-pointer"
                    >
                      {copied ? (
                        <><Check className="w-3 h-3" /> COPIADO</>
                      ) : (
                        <><Copy className="w-3 h-3" /> COPIAR</>
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-mono text-white/90 break-all select-all leading-relaxed">{compound.IUPAC}</p>
                </div>
              )}

              {/* Bio Info Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/2 border border-white/5 rounded-xl p-4 space-y-2 flex flex-col justify-center">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary" /> Variáveis Biológicas
                  </h4>
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${compound['Ionização'] === 'Neutra' ? 'bg-white/5 text-text-muted border border-white/10' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                      {compound['Ionização']}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning border border-warning/20">
                      {compound['Metabolismo']}
                    </span>
                  </div>
                </div>

                <div className="bg-white/2 border border-white/5 rounded-xl p-4 space-y-2">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-success" /> Métricas de Identificação
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-mono pt-1">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-text-muted text-[9px] uppercase tracking-wide">1º Frag:</span>
                      <span className="text-white font-bold">{Number(compound['Fragmentation Score'] || 0).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-text-muted text-[9px] uppercase tracking-wide">2º Iso:</span>
                      <span className="text-white font-bold">{Number(compound['Isotope Similarity'] || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted text-[9px] uppercase tracking-wide">3º Erro:</span>
                      <span className="text-white font-bold">{Number(compound['Mass Error (ppm)'] || 0).toFixed(2)} ppm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted text-[9px] uppercase tracking-wide">4º Fórmula:</span>
                      <span className="text-primary text-glow-primary font-bold">{Number(compound['Score'] || 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {compound['Descricao'] && compound['Descricao'] !== 'Sem descrição' && compound['Descricao'] !== 'Não localizado em bancos biológicos' && (
                <div className="border-t border-white/5 pt-5 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block">Descrição Biológica</span>
                  <p className="text-xs text-text-muted leading-relaxed font-sans text-justify">
                    {compound['Descricao']}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAFETY & TOXICITY */}
          {activeTab === 'safety' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-danger/5 border border-danger/15 rounded-xl p-5 space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-danger flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse"></span>
                  Segurança Química & Advertências (GHS)
                </h4>
                <div className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap font-sans text-justify bg-white/2 p-4 rounded-lg border border-white/5 max-h-[220px] overflow-y-auto scrollbar-thin">
                  {compound.Seguranca || "Sem advertências documentadas no PubChem GHS"}
                </div>
              </div>

              <div className="bg-white/3 border border-white/5 rounded-xl p-5 space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-muted flex items-center gap-1.5 font-bold">
                  Sumário de Toxicidade & Ecotoxicológico
                </h4>
                <div className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap font-sans text-justify bg-white/2 p-4 rounded-lg border border-white/5 max-h-[220px] overflow-y-auto scrollbar-thin">
                  {compound.Toxicidade || "Sem sumários toxicológicos documentados"}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USES & FOOD ADDITIVES */}
          {activeTab === 'uses' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-warning/5 border border-warning/15 rounded-xl p-5 space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-warning flex items-center gap-1.5 font-bold">
                  Aplicações e Manufatura (Uses & Manufacturing)
                </h4>
                <div className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap font-sans text-justify bg-white/2 p-4 rounded-lg border border-white/5 max-h-[220px] overflow-y-auto scrollbar-thin">
                  {compound.Aplicacoes || "Sem aplicações documentadas nas bases de manufatura"}
                </div>
              </div>

              <div className="bg-white/3 border border-white/5 rounded-xl p-5 space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-muted flex items-center gap-1.5 font-bold">
                  Aditivos e Ingredientes Alimentares (Food Additives)
                </h4>
                <div className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap font-sans text-justify bg-white/2 p-4 rounded-lg border border-white/5 max-h-[220px] overflow-y-auto scrollbar-thin">
                  {compound.Aditivos_Alimentares || "Sem registros documentados de uso como aditivo alimentar"}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ONTOLOGY & GLOBAL REGISTRIES */}
          {activeTab === 'ontology' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white/3 border border-white/5 rounded-xl p-5 space-y-4">
                {compound['Categoria química'] && compound['Categoria química'] !== 'Não classificado' && compound['Categoria química'] !== 'Não localizado' && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block">Categoria Química (ChEBI)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {compound['Categoria química'].split(', ').map((cat, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-md text-xs text-white/80">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {compound['Vias metabólicas'] && compound['Vias metabólicas'] !== 'Não documentada' && compound['Vias metabólicas'] !== 'Não localizado' && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block">Vias Metabólicas (KEGG)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {compound['Vias metabólicas'].split(', ').map((path, i) => (
                        <span key={i} className="px-2.5 py-1 bg-success/15 border border-success/20 text-success rounded-md text-xs font-semibold">
                          {path}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* MeSH and NCI concepts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/2 border border-white/5 rounded-xl p-4 space-y-2">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                    Classificação Farmacológica MeSH
                  </h4>
                  <p className="text-xs text-white/90 leading-relaxed font-sans text-justify">
                    {compound.MeSH_Class || "Sem classificação MeSH activa"}
                  </p>
                </div>

                <div className="bg-white/2 border border-white/5 rounded-xl p-4 space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1">
                      NCI Thesaurus Concept Code
                    </h4>
                    <p className="text-xs text-glow-primary text-primary font-mono font-bold">
                      {compound.NCI_Thesaurus || "Não classificado no NCI"}
                    </p>
                  </div>
                  {compound.NCI_Thesaurus && compound.NCI_Thesaurus !== "Não documentado" && (
                    <a
                      href={`https://ncit.nci.nih.gov/ncitbrowser/ConceptReport.jsp?dictionary=NCI_Thesaurus&code=${compound.NCI_Thesaurus}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-mono text-primary hover:underline hover:text-primary-hover mt-3"
                    >
                      Acessar NCI Thesaurus <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

        </div> {/* Closes Right Column */}
      </div> {/* Closes Modal Container */}
    </div>
  );
}

export default function ResultsTable({ data }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompound, setSelectedCompound] = useState(null);

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

  const isCidValido = (cid) => {
    if (!cid) return false;
    const strCid = String(cid).trim().toLowerCase();
    return strCid !== '' && strCid !== 'não localizado' && strCid !== 'none' && strCid !== 'nan' && strCid !== 'null' && strCid !== 'undefined';
  };

  const getPubchemImageUrl = (cid) => {
    if (!isCidValido(cid)) return null;
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
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-primary/20 hover:bg-primary-hover hover:scale-[1.02] active:scale-95 cursor-pointer"
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
                <th className="px-6 py-5 text-right w-64">Métricas de Identificação (Escadinha)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((row, idx) => {
                let cid = row['ID'] || null;
                const imgUrl = getPubchemImageUrl(cid);

                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedCompound(row)}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                  >
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
                      <div className="font-semibold text-white text-base mb-1 group-hover:text-primary transition-colors">
                        {row['Nome_Facil'] || row['Composto']}
                      </div>
                      <div className="text-text-muted flex flex-col gap-0.5 text-xs">
                        {row['Nome_Facil'] && row['Nome_Facil'] !== row['Composto'] && (
                          <span className="text-text-muted/65 italic mb-1.5 max-w-[280px] sm:max-w-[400px] truncate block" title={row['Composto']}>
                            Ref: {row['Composto']}
                          </span>
                        )}
                        <span>Fórmula: <span className="text-white/70">{row['Fórmula']}</span></span>
                        <span>Massa: <span className="text-white/70">{Number(row['Massa'] || 0).toFixed(4)}</span></span>
                      </div>
                      {isCidValido(row['ID']) && <div className="text-[10px] text-primary/60 mt-3 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> CID_{row['ID']}</div>}
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
                        {row['Categoria química'] && row['Categoria química'] !== 'Não categorizado' && row['Categoria química'] !== 'Não classificado' && (
                          <div className="inline-block px-2 py-1 bg-white/5 text-text-muted border border-white/10 rounded-md">
                            {row['Categoria química'].split(', ')[0]}
                          </div>
                        )}

                        {row['Vias metabólicas'] && row['Vias metabólicas'] !== 'Desconhecida' && row['Vias metabólicas'] !== 'Não documentada' && (
                          <div className="block">
                            <span className="inline-block px-2 py-1 bg-success/10 text-success rounded-md text-[10px] font-bold uppercase">
                              VIAS ({row['Vias metabólicas'].split(', ').length})
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end space-y-1 font-mono text-xs text-glow-primary">
                        <div className="flex justify-between w-full max-w-[180px] gap-2">
                          <span className="text-text-muted uppercase text-[9px] tracking-wider text-left">1º Frag:</span>
                          <span className="font-bold text-white text-right">{Number(row['Fragmentation Score'] || 0).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between w-full max-w-[180px] gap-2">
                          <span className="text-text-muted uppercase text-[9px] tracking-wider text-left">2º Iso:</span>
                          <span className="font-bold text-white text-right">{Number(row['Isotope Similarity'] || 0).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between w-full max-w-[180px] gap-2">
                          <span className="text-text-muted uppercase text-[9px] tracking-wider text-left">3º Erro:</span>
                          <span className={`font-bold text-right ${Math.abs(row['Mass Error (ppm)'] || 0) > 5 ? 'text-danger' : 'text-success'}`}>
                            {Number(row['Mass Error (ppm)'] || 0).toFixed(2)} ppm
                          </span>
                        </div>
                        <div className="flex justify-between w-full max-w-[180px] gap-2 border-t border-white/5 pt-1 mt-1">
                          <span className="text-text-muted uppercase text-[9px] tracking-wider text-left">4º Fórmula:</span>
                          <span className="font-bold text-primary text-glow-primary text-right">{Number(row['Score'] || 0).toFixed(1)}</span>
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

      {/* Detail Modal */}
      {selectedCompound && (
        <CompoundDetailModal
          compound={selectedCompound}
          onClose={() => setSelectedCompound(null)}
        />
      )}
    </div>
  );
}
