import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Search, Activity, Database, Clock, FlaskConical,
  TrendingUp, Zap, ShieldCheck, ChevronRight, Loader2,
  BarChart3, PieChart as PieChartIcon, X, ExternalLink, Copy, Check, Info, Layers, Cloud, Globe
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  ChartTooltip,
  ChartLegend,
  ArcElement
);

const isCidValido = (cid) => {
  if (!cid) return false;
  const strCid = String(cid).trim().toLowerCase();
  return strCid !== '' && strCid !== 'não localizado' && strCid !== 'none' && strCid !== 'nan' && strCid !== 'null' && strCid !== 'undefined';
};

// ── Reusable Compound Detail Modal (extracted for shared usage) ──
function CompoundDetailModal({ compound, onClose }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [view2D, setView2D] = useState(false);

  const isDataAvailable = (val) => {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    return s !== '' && s !== 'n/a' && s !== '0' && s !== 'não documentado' && s !== 'não localizado' && s !== 'não classificado' && s !== 'desconhecido' && s !== 'desconhecida' && s !== 'sem dados' && s !== 'sem associação documentada' && s !== 'não documentado na base direta' && s !== 'erro de processamento' && s !== 'none' && s !== 'nan';
  };





  const [has3D, setHas3D] = useState(false);
  const [checking3D, setChecking3D] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);

    if (compound.ID && isCidValido(compound.ID)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecking3D(true);
      axios.get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.ID}/record/JSON/?record_type=3d`)
        .then(() => {
          setHas3D(true);
          setView2D(false);
        })
        .catch(() => {
          setHas3D(false);
          setView2D(true);
        })
        .finally(() => {
          setChecking3D(false);
        });
    } else {
      setHas3D(false);
      setView2D(true);
      setChecking3D(false);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [compound.ID, onClose]);

  const handleCopyIupac = () => {
    if (compound.IUPAC) {
      navigator.clipboard.writeText(compound.IUPAC);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };



  const imgUrl = isCidValido(compound.ID)
    ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.ID}/PNG`
    : null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-background/95 border border-white/10 rounded-2xl glass-panel shadow-neon-primary animate-in zoom-in-95 duration-300 flex flex-col z-[9999] overflow-hidden">

        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all text-text-muted hover:text-white z-50 cursor-pointer shadow-lg">
          <X className="w-5 h-5" />
        </button>

        {/* SCROLLABLE CONTENT */}
        <div className="w-full h-full overflow-y-auto flex flex-col scrollbar-thin">
          {/* TOP HEADER: 3D MODEL OR 2D IMAGE */}
          <div className="w-full h-[250px] sm:h-[350px] bg-black relative flex-shrink-0 overflow-hidden border-b border-white/10 group">
            {checking3D ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 p-6 text-text-muted text-xs">
                <Loader2 className="w-8 h-8 mb-3 animate-spin text-primary opacity-50" />
                <span>Verificando disponibilidade do modelo 3D...</span>
              </div>
            ) : view2D ? (
              <div className="w-full h-full flex items-center justify-center bg-white/5 p-6">
                {imgUrl ? (
                  <img src={imgUrl} alt={compound.Composto} className="max-w-full max-h-full object-contain filter invert opacity-90 drop-shadow-2xl" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-text-muted text-xs">
                    <ShieldCheck className="w-12 h-12 mb-3 opacity-30" />
                    <span>Sem estrutura molecular disponível</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-[900px] absolute top-[-320px] left-0 pointer-events-auto">
                <iframe
                  src={`https://pubchem.ncbi.nlm.nih.gov/compound/${compound.ID}#section=3D-Conformer&embed=true`}
                  className="w-full h-full border-0"
                  title={`3D Conformer of ${compound.Composto}`}
                  scrolling="no"
                />
              </div>
            )}

            {!checking3D && has3D && (
              <button
                onClick={() => setView2D(!view2D)}
                className="absolute bottom-4 left-4 z-20 px-5 py-2 text-[10px] font-mono tracking-widest bg-black/60 backdrop-blur-md border border-white/20 text-white rounded-xl hover:bg-black/80 transition-all uppercase flex items-center gap-2 shadow-lg"
              >
                <Layers className="w-3.5 h-3.5 text-primary" /> {view2D ? 'VER MODELO 3D (INTERATIVO)' : 'VER ESTRUTURA 2D'}
              </button>
            )}
          </div>

          {/* BOTTOM DETAILS */}
          <div className="w-full p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
                  <p className="font-mono text-xs text-text-muted mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                    PubChem CID: <span className="text-white">{compound.ID}</span>
                  </p>
                )}
              </div>

              {compound.ID && (
                <a
                  href={`https://pubchem.ncbi.nlm.nih.gov/compound/${compound.ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary/20 text-primary font-mono text-xs rounded-xl hover:bg-primary/20 hover:scale-[1.02] transition-all shadow-lg"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> VER NO PUBCHEM
                </a>
              )}
            </div>

            {/* Indicador de Qualidade dos Dados */}
            {(() => {
              const checkFields = ['Categoria química', 'Vias metabólicas', 'ClassyFire_Class', 'Kingdom', 'HMDB_Disease', 'Seguranca', 'Toxicidade', 'MeSH_Class'];
              const filled = checkFields.filter(f => isDataAvailable(compound[f])).length;
              const pct = Math.round((filled / checkFields.length) * 100);
              const color = pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger';
              return (
                <div className="flex items-center gap-3 px-3 py-2 bg-white/3 rounded-lg border border-white/5 text-[10px] font-mono">
                  <span className="text-text-muted uppercase tracking-wider whitespace-nowrap">Cobertura de dados</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-${color} font-bold`}>{filled}/{checkFields.length}</span>
                  {pct < 50 && <span className="text-text-muted/60 italic hidden sm:inline">— Composto com pouca documentação nas bases públicas</span>}
                </div>
              );
            })()}

            <div className="flex border-b border-white/10 gap-1 pb-px overflow-x-auto scrollbar-none font-mono text-[10px] sm:text-xs">
              <button onClick={() => setActiveTab('overview')} className={`px-3 sm:px-4 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${activeTab === 'overview' ? 'border-primary text-primary text-glow-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-white'}`}>
                <Info className="w-3.5 h-3.5" /> Geral
              </button>
              <button onClick={() => setActiveTab('safety')} className={`px-3 sm:px-4 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${activeTab === 'safety' ? 'border-danger text-danger bg-danger/5' : 'border-transparent text-text-muted hover:text-white'}`}>
                <ShieldCheck className="w-3.5 h-3.5 text-danger" /> Segurança
              </button>
              <button onClick={() => setActiveTab('ontology')} className={`px-3 sm:px-4 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${activeTab === 'ontology' ? 'border-success text-success text-glow-success bg-success/5' : 'border-transparent text-text-muted hover:text-white'}`}>
                <Layers className="w-3.5 h-3.5 text-success" /> Ontologia
              </button>
              <button onClick={() => setActiveTab('metabolomics')} className={`px-3 sm:px-4 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${activeTab === 'metabolomics' ? 'border-warning text-warning text-glow-warning bg-warning/5' : 'border-transparent text-text-muted hover:text-white'}`}>
                <Activity className="w-3.5 h-3.5 text-warning" /> Metabolômica
              </button>
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-0.5">Fórmula Molecular</p>
                    <p className="text-lg font-bold text-white tracking-wide">{compound.Fórmula || compound['Fórmula'] || 'N/A'}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-0.5">Massa Molecular</p>
                    <p className="text-lg font-bold text-white tracking-wide">{compound.Massa && compound.Massa !== 0 ? `${Number(compound.Massa).toFixed(4)} u` : 'N/A'}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-0.5">m/z</p>
                    {compound['m/z'] && Number(compound['m/z']) > 0 ? (
                      <p className="text-lg font-bold text-white tracking-wide">{Number(compound['m/z']).toFixed(4)}</p>
                    ) : compound.Massa && Number(compound.Massa) > 0 ? (
                      <p className="text-lg font-bold text-white/60 tracking-wide" title="m/z teórico estimado: [M+H]⁺ = massa + 1.00728">~{(Number(compound.Massa) + 1.00728).toFixed(4)} <span className="text-[8px] text-text-muted font-normal">(teórico)</span></p>
                    ) : (
                      <p className="text-sm text-text-muted/50 italic">Dado experimental</p>
                    )}
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-0.5">Tempo de Retenção</p>
                    {compound['Retention time (min)'] && Number(compound['Retention time (min)']) > 0 ? (
                      <p className="text-lg font-bold text-white tracking-wide">{Number(compound['Retention time (min)']).toFixed(2)} min</p>
                    ) : (
                      <p className="text-sm text-text-muted/50 italic">Dado experimental</p>
                    )}
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-0.5">Abund. Relativa</p>
                    {compound.Abundancia_Relativa && Number(compound.Abundancia_Relativa) > 0 ? (
                      <p className="text-lg font-bold text-white tracking-wide" title={compound.Abundancia_Relativa}>{Number(compound.Abundancia_Relativa).toExponential(2)}</p>
                    ) : (
                      <p className="text-sm text-text-muted/50 italic">Dado experimental</p>
                    )}
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-0.5">Amostra Max</p>
                    {isDataAvailable(compound.Amostra_Mais_Abundante) ? (
                      <p className="text-lg font-bold text-white tracking-wide truncate" title={compound.Amostra_Mais_Abundante}>{compound.Amostra_Mais_Abundante}</p>
                    ) : (
                      <p className="text-sm text-text-muted/50 italic">Dado experimental</p>
                    )}
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-0.5">Modo Aquisição</p>
                    {isDataAvailable(compound.Modo_Aquisicao) ? (
                      <p className="text-lg font-bold text-white tracking-wide">{compound.Modo_Aquisicao}</p>
                    ) : compound.Ionização && compound.Ionização !== 'Desconhecida' ? (
                      <p className="text-lg font-bold text-white/60 tracking-wide">{compound.Ionização === 'Catiônica' ? 'Positivo' : compound.Ionização === 'Aniônica' ? 'Negativo' : compound.Ionização} <span className="text-[8px] text-text-muted font-normal">(estimado)</span></p>
                    ) : (
                      <p className="text-sm text-text-muted/50 italic">Dado experimental</p>
                    )}
                  </div>
                </div>
                {compound.IUPAC && compound.IUPAC !== 'Não localizado' && (
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Nomenclatura IUPAC</span>
                      <button onClick={handleCopyIupac} className="flex items-center gap-1.5 text-[10px] font-mono text-primary hover:text-primary-hover cursor-pointer">
                        {copied ? (<><Check className="w-3 h-3" /> COPIADO</>) : (<><Copy className="w-3 h-3" /> COPIAR</>)}
                      </button>
                    </div>
                    <p className="text-xs font-mono text-white/90 break-all select-all leading-relaxed">{compound.IUPAC}</p>
                  </div>
                )}
                {compound.Descricao && compound.Descricao !== 'Sem descrição' && compound.Descricao !== 'Não localizado em bancos biológicos' && (
                  <div className="border-t border-white/5 pt-5 space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block">Descrição Biológica</span>
                    <p className="text-xs text-text-muted leading-relaxed font-sans text-justify">{compound.Descricao}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'safety' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-danger/5 border border-danger/15 rounded-xl p-5 space-y-2">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-danger flex items-center gap-1.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse"></span> Segurança Química (GHS)
                  </h4>
                  <div className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap font-sans text-justify bg-white/2 p-4 rounded-lg border border-white/5 max-h-[220px] overflow-y-auto scrollbar-thin">
                    {compound.Seguranca || "Sem advertências documentadas"}
                  </div>
                </div>
                <div className="bg-white/3 border border-white/5 rounded-xl p-5 space-y-2">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-muted flex items-center gap-1.5 font-bold">Toxicidade</h4>
                  <div className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap font-sans text-justify bg-white/2 p-4 rounded-lg border border-white/5 max-h-[220px] overflow-y-auto scrollbar-thin">
                    {compound.Toxicidade || "Sem sumários toxicológicos documentados"}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ontology' && (
              <div className="space-y-6 animate-in fade-in duration-300">

                <div className="bg-white/3 border border-white/5 rounded-xl p-5 space-y-4">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-muted flex items-center gap-1.5 font-bold border-b border-white/10 pb-2">Classificação Química (ClassyFire & ChEBI)</h4>

                  {isDataAvailable(compound.ClassyFire_Class) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div className="bg-white/5 border border-white/5 rounded-lg p-3">
                        <span className="text-[9px] font-mono uppercase text-text-muted block mb-1">Superclasse</span>
                        <span className="text-xs font-semibold text-white/90">{compound.ClassyFire_Superclass}</span>
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded-lg p-3">
                        <span className="text-[9px] font-mono uppercase text-text-muted block mb-1">Classe</span>
                        <span className="text-xs font-semibold text-white/90">{compound.ClassyFire_Class}</span>
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded-lg p-3">
                        <span className="text-[9px] font-mono uppercase text-text-muted block mb-1">Subclasse</span>
                        <span className="text-xs font-semibold text-white/90">{compound.ClassyFire_Subclass}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-white/3 rounded-lg border border-white/5 mb-4">
                      <Cloud className="w-4 h-4 text-text-muted/50 shrink-0" />
                      <p className="text-xs text-text-muted/70 italic">ClassyFire: Composto não registrado na base de classificação química. Pode ser uma molécula nova ou rara.</p>
                    </div>
                  )}

                  {compound['Categoria química'] && compound['Categoria química'] !== 'Não classificado' && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block">Ontologia ChEBI</span>
                      <div className="flex flex-wrap gap-1.5">
                        {compound['Categoria química'].split(', ').slice(0, 6).map((cat, i) => (
                          <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-md text-xs text-white/80">{cat}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white/3 border border-white/5 rounded-xl p-5 space-y-4">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-muted flex items-center gap-1.5 font-bold border-b border-white/10 pb-2">Taxonomia Biológica Inferida</h4>
                  {compound.Kingdom && compound.Kingdom !== 'Não documentado' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {['Kingdom', 'Phylum', 'Class_Taxonomy', 'Order'].map((tax) => (
                        <div key={tax} className="bg-white/5 border border-white/5 rounded-lg p-3">
                          <span className="text-[9px] font-mono uppercase text-text-muted block mb-1">{tax.replace('_Taxonomy', '')}</span>
                          <span className="text-xs font-semibold text-success/90 truncate block" title={compound[tax]}>{compound[tax]}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted">Taxonomia biológica não inferida para este composto.</p>
                  )}
                </div>

              </div>
            )}

            {activeTab === 'metabolomics' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white/3 border border-white/5 rounded-xl p-5 space-y-4">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-warning flex items-center gap-1.5 font-bold border-b border-white/10 pb-2">Contexto Clínico & Metabolômico (HMDB & KEGG)</h4>

                  {compound['Vias metabólicas'] && compound['Vias metabólicas'] !== 'Não documentada' && (
                    <div className="space-y-2 mb-4">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block">Vias Metabólicas (KEGG)</span>
                      <div className="flex flex-wrap gap-1.5">
                        {compound['Vias metabólicas'].split(', ').slice(0, 6).map((path, i) => (
                          <span key={i} className="px-2.5 py-1 bg-warning/15 border border-warning/20 text-warning rounded-md text-xs font-semibold">{path}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-2">Associação a Doenças (HMDB)</span>
                      {isDataAvailable(compound.HMDB_Disease) ? (
                        <p className="text-xs text-white/90 leading-relaxed font-sans">{compound.HMDB_Disease}</p>
                      ) : (
                        <p className="text-xs text-text-muted/50 italic flex items-center gap-1"><Cloud className="w-3 h-3" /> Nenhuma associação a doenças encontrada no HMDB para este composto</p>
                      )}
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-2">Tecidos / Biospécimes (HMDB)</span>
                      {isDataAvailable(compound.HMDB_Tissue) ? (
                        <p className="text-xs text-white/90 leading-relaxed font-sans">{compound.HMDB_Tissue}</p>
                      ) : (
                        <p className="text-xs text-text-muted/50 italic flex items-center gap-1"><Cloud className="w-3 h-3" /> Sem dados de tecidos no HMDB para este composto</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Animated Counter ──
function AnimatedCounter({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) {
      setTimeout(() => setDisplay(0), 0);
      return;
    }
    const start = 0;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (value - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <span>{display.toLocaleString('pt-BR')}</span>;
}

// ── Chart Color Palette ──
const CHART_COLORS = ['#38b6ff', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#6366f1'];

// ══════════════════════════════════════
// ── MAIN DASHBOARD COMPONENT ──
// ══════════════════════════════════════
export default function DashboardView({ onViewResults, onViewAllLogs }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchingExternal, setSearchingExternal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimeout = useRef(null);

  // Modal
  const [selectedCompound, setSelectedCompound] = useState(null);

  async function fetchStats() {
    try {
      const res = await axios.get('/api/dashboard/stats');
      setStats(res.data);
    } catch {
      setError('Falha ao conectar com o servidor de dados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, []);

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q || q.length < 2) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    setSearching(true);
    setShowSearch(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/dashboard/search?q=${encodeURIComponent(q)}`);
        setSearchResults(res.data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleExternalSearch = async () => {
    if (!searchQuery || searchQuery.trim().length < 2) return;
    setSearchingExternal(true);
    try {
      const res = await axios.get(`/api/dashboard/search-external?q=${encodeURIComponent(searchQuery)}`);
      if (res.data && res.data.length > 0) {
        setSearchResults(prev => {
          const combined = [...prev];
          res.data.forEach(extItem => {
            if (!combined.find(c => c.ID === extItem.ID && c.Composto === extItem.Composto)) {
              combined.push(extItem);
            }
          });
          return combined;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingExternal(false);
    }
  };

  const isCidValido = (cid) => {
    if (!cid) return false;
    const s = String(cid).trim().toLowerCase();
    return s !== '' && s !== 'não localizado' && s !== 'none' && s !== 'nan' && s !== 'null' && s !== 'undefined';
  };



  // ── LOADING STATE ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-text-muted text-sm font-mono uppercase tracking-widest">Carregando Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 glass-panel rounded-3xl border border-danger/20">
        <Activity className="w-12 h-12 text-danger/50 mx-auto mb-4" />
        <p className="text-danger font-mono uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  // Prepare chart data - truncate long category names safely
  const categoriaData = (stats.dist_categoria || []).map(d => {
    const nome = d.nome || 'Desconhecido';
    return {
      nome: String(nome).length > 30 ? String(nome).substring(0, 28) + '…' : String(nome),
      total: d.total || 0
    };
  });

  const ionizacaoData = (stats.dist_ionizacao || []).filter(d => d && d.nome && String(d.nome).trim());
  const metabolismoData = (stats.dist_metabolismo || []).filter(d => d && d.nome && String(d.nome).trim());

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

      {/* ═══ SECTION 1: HERO STATS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Card 1: Análises */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-primary/30 transition-all duration-500 group shadow-[0_0_20px_rgba(56,182,255,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -translate-y-6 translate-x-6 group-hover:bg-primary/10 transition-colors"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight mb-1"><AnimatedCounter value={stats.total_analises} /></p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Análises Realizadas</p>
          </div>
        </div>

        {/* Card 2: Compostos */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-success/30 transition-all duration-500 group shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-full blur-2xl -translate-y-6 translate-x-6 group-hover:bg-success/10 transition-colors"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-success/10 border border-success/20 rounded-xl">
                <FlaskConical className="w-4 h-4 text-success" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight mb-1"><AnimatedCounter value={stats.total_compostos} /></p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Compostos Identificados</p>
          </div>
        </div>

        {/* Card 3: Únicos */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-warning/30 transition-all duration-500 group shadow-[0_0_20px_rgba(245,158,11,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 rounded-full blur-2xl -translate-y-6 translate-x-6 group-hover:bg-warning/10 transition-colors"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-warning/10 border border-warning/20 rounded-xl">
                <Database className="w-4 h-4 text-warning" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight mb-1"><AnimatedCounter value={stats.compostos_unicos} /></p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Compostos Únicos</p>
          </div>
        </div>

        {/* Card 4: Cache */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-primary/30 transition-all duration-500 group shadow-[0_0_20px_rgba(56,182,255,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -translate-y-6 translate-x-6 group-hover:bg-primary/10 transition-colors"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl">
                <Zap className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight mb-1"><AnimatedCounter value={stats.total_cache} /></p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Cache Ativo</p>
          </div>
        </div>
      </div>

      {/* ── Last analysis info ── */}
      {stats.ultima_analise && (
        <div className="flex items-center gap-2 text-xs text-text-muted font-mono px-1">
          <Clock className="w-3.5 h-3.5 text-primary/60" />
          <span>Última análise: <span className="text-white/80">{stats.ultima_analise}</span></span>
        </div>
      )}

      {/* ═══ SECTION 2: SEARCH BAR ═══ */}
      <div className="relative">
        <div className="glass-panel rounded-2xl border border-white/5 p-2 flex items-center gap-3 hover:border-primary/20 transition-all focus-within:border-primary/40 focus-within:shadow-[0_0_30px_rgba(56,182,255,0.1)]">
          <div className="pl-4">
            <Search className="w-5 h-5 text-text-muted" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar compostos em todas as análises — nome, fórmula, CID, categoria..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowSearch(true); }}
            className="flex-1 bg-transparent text-white text-sm py-3.5 outline-none placeholder:text-text-muted/50 font-sans"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearch(false); }}
              className="p-2 text-text-muted hover:text-white transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearch && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 glass-panel bg-background/98 rounded-2xl border border-white/10 shadow-2xl max-h-[420px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
            {searching ? (
              <div className="p-8 text-center border-b border-white/5">
                <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto mb-2" />
                <p className="text-text-muted text-xs font-mono">Buscando...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-8 text-center border-b border-white/5">
                <p className="text-text-muted text-xs font-mono uppercase tracking-widest">Nenhum composto encontrado para "{searchQuery}"</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                <div className="px-5 py-3 flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">{searchResults.length} resultado(s)</span>
                  <button onClick={() => setShowSearch(false)} className="text-text-muted hover:text-white text-xs cursor-pointer">Fechar</button>
                </div>
                {searchResults.map((compound, idx) => {
                  const imgUrl = isCidValido(compound.ID)
                    ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.ID}/PNG`
                    : null;
                  return (
                    <button
                      key={idx}
                      onClick={() => { setSelectedCompound(compound); setShowSearch(false); }}
                      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left cursor-pointer"
                    >
                      {imgUrl ? (
                        <div className="w-12 h-12 bg-white/5 rounded-lg border border-white/10 p-1.5 flex items-center justify-center shrink-0">
                          <img src={imgUrl} alt="" className="max-w-full max-h-full object-contain filter invert opacity-80" loading="lazy" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-white/5 rounded-lg border border-dashed border-white/10 flex items-center justify-center shrink-0">
                          <FlaskConical className="w-4 h-4 text-text-muted/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold text-sm truncate">{compound.Nome_Facil || compound.Composto}</p>
                          {compound.origem === 'pubchem' && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                              <Globe className="w-2.5 h-2.5" /> Web
                            </span>
                          )}
                        </div>
                        <p className="text-text-muted text-xs truncate mt-0.5">{compound['Fórmula'] || compound.Fórmula} · {compound['Categoria química'] || 'Sem categoria'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {compound.origem === 'pubchem' ? (
                          <div className="flex flex-col items-end justify-center h-full">
                            <Cloud className="w-4 h-4 text-primary/60 mb-0.5" />
                            <p className="text-[9px] text-primary/60 font-mono uppercase">Online</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-primary font-mono font-bold text-sm">{Number(compound.Score || compound['Score'] || 0).toFixed(1)}</p>
                            <p className="text-[9px] text-text-muted font-mono uppercase">Score</p>
                          </>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted/40 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            {searchQuery && searchQuery.length >= 2 && !searching && (
              <div className="p-4 bg-background/50">
                <button
                  onClick={handleExternalSearch}
                  disabled={searchingExternal}
                  className="w-full py-3 bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 rounded-xl text-primary font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {searchingExternal ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Buscando na Nuvem...</>
                  ) : (
                    <><Globe className="w-4 h-4" /> Buscar "{searchQuery}" no PubChem</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ SECTION 3: RECENT ANALYSES ═══ */}
      {stats.analises_recentes && stats.analises_recentes.length > 0 && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-primary to-primary/30 shadow-[0_0_10px_#38b6ff]"></div>
              <Clock className="w-5 h-5 text-primary/70" />
              <h2 className="text-xl font-semibold text-white tracking-tight">Análises Recentes</h2>
            </div>

            <button
              onClick={onViewAllLogs}
              className="px-4 py-2 bg-white/5 border border-white/10 hover:border-primary/30 hover:bg-white/10 text-text-muted hover:text-white rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-300 flex items-center gap-2 group cursor-pointer"
            >
              Ver todos os logs
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {stats.analises_recentes.map((a) => (
              <button
                key={a.id}
                onClick={async () => {
                  try {
                    const res = await axios.get(`/api/history/${a.id}`);
                    onViewResults(res.data);
                  } catch {
                    alert('Falha ao carregar análise.');
                  }
                }}
                className="glass-panel rounded-xl border border-white/5 p-5 text-left hover:border-primary/30 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs font-mono text-primary font-bold group-hover:text-glow-primary transition-all">#{String(a.id).padStart(4, '0')}</div>
                  <div className="flex-1"></div>
                  <div className="text-[10px] text-text-muted bg-white/5 border border-white/5 px-2 py-0.5 rounded-md group-hover:border-primary/20 transition-all">{a.num_compostos} compostos</div>
                </div>
                <p className="text-[10px] text-text-muted font-mono truncate mb-1.5" title={a.arquivo_id}>{a.arquivo_id}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-text-muted/60 font-mono">
                  <Clock className="w-3 h-3" />
                  {a.data_hora}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SECTION 4: ANALYTICS CHARTS ═══ */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-success to-warning shadow-[0_0_10px_#10b981]"></div>
          <PieChartIcon className="w-5 h-5 text-success" />
          <h2 className="text-xl font-semibold text-white tracking-tight">Dashboards Analíticos</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Chart 1: Categories Bar Chart */}
          {categoriaData.length > 0 && (
            <div className="glass-panel rounded-2xl border border-white/5 p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-4 h-4 text-primary/70" />
                <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted">Distribuição por Categoria Química</h3>
              </div>
              <div className="w-full h-[300px]">
                <Bar
                  data={{
                    labels: categoriaData.map(d => d.nome),
                    datasets: [{
                      label: 'Quantidade',
                      data: categoriaData.map(d => d.total),
                      backgroundColor: categoriaData.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + 'D9'),
                      borderRadius: 4,
                    }]
                  }}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(11, 15, 25, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 12,
                        displayColors: true,
                      }
                    },
                    scales: {
                      x: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#94a3b8', font: { size: 10 } }, border: { display: false } },
                      y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } }, border: { display: false } }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Chart 2: Ionization Pie Chart */}
          {ionizacaoData.length > 0 && (
            <div className="glass-panel rounded-2xl border border-white/5 p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="w-4 h-4 text-warning/70" />
                <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted">Distribuição por Ionização</h3>
              </div>
              <div className="w-full h-[300px] flex justify-center pb-4">
                <Pie
                  data={{
                    labels: ionizacaoData.map(d => d.nome),
                    datasets: [{
                      data: ionizacaoData.map(d => d.total),
                      backgroundColor: ionizacaoData.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                      borderColor: '#0b0f19',
                      borderWidth: 2,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8', usePointStyle: true, pointStyle: 'circle', font: { size: 11, family: 'monospace' }, padding: 20 }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(11, 15, 25, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 12,
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Chart 3: Metabolism Bar Chart */}
          {metabolismoData.length > 0 && (
            <div className="glass-panel rounded-2xl border border-white/5 p-6 shadow-lg lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-4 h-4 text-success/70" />
                <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted">Distribuição por Metabolismo</h3>
              </div>
              <div className="w-full h-[250px]">
                <Bar
                  data={{
                    labels: metabolismoData.map(d => d.nome),
                    datasets: [{
                      label: 'Quantidade',
                      data: metabolismoData.map(d => d.total),
                      backgroundColor: metabolismoData.map((_, i) => CHART_COLORS[(i + 1) % CHART_COLORS.length] + 'D9'),
                      borderRadius: 4,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(11, 15, 25, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 12,
                        displayColors: true,
                      }
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } }, border: { display: false } },
                      y: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#94a3b8', font: { size: 10 } }, border: { display: false } }
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>



      {/* ── Compound Detail Modal ── */}
      {selectedCompound && (
        <CompoundDetailModal compound={selectedCompound} onClose={() => setSelectedCompound(null)} />
      )}
    </div>
  );
}
