import pandas as pd
import requests
import time
import logging
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache
from urllib.parse import quote
import database as db

logging.basicConfig(level=logging.INFO)

TIMEOUT = 10  # Aumentado para lidar com APIs lentas do EBI
HEADERS = {"User-Agent": "QuimioAnalytics/1.0 (+https://www.ebi.ac.uk/chebi/)"}

# -------------------------------
# REQUEST SEGURO
# -------------------------------
def safe_request(url, retries=3):
    for i in range(retries):
        try:
            r = requests.get(url, timeout=TIMEOUT, headers=HEADERS)
            if r.status_code == 200:
                return r
            if r.status_code == 404: # Se não existe, não adianta tentar de novo
                return None
        except:
            time.sleep(1 * (i + 1))
    return None

# -------------------------------
# BUSCA INTELIGENTE
# -------------------------------
def buscar_composto(nome):
    if not isinstance(nome, str) or not nome.strip() or nome.lower() == 'nan':
        return None

    # Limpeza básica: remover excesso de espaços e caracteres estranhos
    nome_limpo = re.sub(r'\s+', ' ', nome).strip()
    
    # 1. Tenta busca exata no PubChem
    encoded = quote(nome_limpo)
    url_exact = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded}/cids/JSON"
    if safe_request(url_exact):
        return nome_limpo

    # 2. Se falhar, tenta usar a busca por texto do PubChem (Namespace 'listkey')
    # Isso ajuda a encontrar compostos por nomes parciais ou sinônimos
    search_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded}/cids/JSON?name_type=word"
    r = safe_request(search_url)
    if r:
        return nome_limpo

    return None

# -------------------------------
# PUBCHEM (ESTABILIZADO)
# -------------------------------
@lru_cache(maxsize=256)
def fetch_pubchem(nome):
    encoded = quote(nome)
    # Busca CID e Propriedades em uma unica chamada (mais rapido e estavel)
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded}/property/Title,MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES/JSON"
    r = safe_request(url)
    if not r: return None

    try:
        data = r.json()
        props = data["PropertyTable"]["Properties"][0]
        cid = props.get("CID")
    except (KeyError, IndexError):
        return None

    # Busca Descrição
    desc_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/description/JSON"
    d_res = safe_request(desc_url)

    res = {
        "cid": cid,
        "titulo": props.get("Title"),
        "formula": props.get("MolecularFormula"),
        "massa": props.get("MolecularWeight"),
        "iupac": props.get("IUPACName"),
        "smiles": props.get("CanonicalSMILES")
    }
    
    if d_res:
        try:
            # Pega a primeira descrição disponível
            descriptions = d_res.json().get("InformationList", {}).get("Information", [])
            for d in descriptions:
                if "Description" in d:
                    res["descricao"] = d["Description"]
                    break
        except: pass
        
    return res

# -------------------------------
# ChEBI (LÓGICA OLS4 REPARADA)
# -------------------------------
@lru_cache(maxsize=256)
def fetch_chebi(nome):
    try:
        # Busca no OLS4 corrigida usando type=class
        search_url = f"https://www.ebi.ac.uk/ols4/api/search?q={quote(nome)}&ontology=chebi&type=class&rows=1"
        r = safe_request(search_url)
        if not r: return []

        docs = r.json().get("response", {}).get("docs", [])
        if not docs: return []

        doc = docs[0]
        # O campo obo_id às vezes é diferente de id. Tentamos ambos.
        chebi_id = doc.get("obo_id") or doc.get("short_form")
        iri = doc.get("iri")
        classes = []

        # 1. Tentar ancestrais via OLS4 (mais rápido que a API do ChEBI para categorias)
        if iri:
            iri_enc = quote(quote(iri, safe='')) # Double encoding necessário para algumas rotas OLS
            ancestors_url = f"https://www.ebi.ac.uk/ols4/api/ontologies/chebi/terms/{iri_enc}/ancestors"
            r_anc = safe_request(ancestors_url)
            if r_anc:
                terms = r_anc.json().get("_embedded", {}).get("terms", [])
                for t in terms:
                    label = t.get("label")
                    if label: classes.append(label)

        # 2. Tentar detalhes específicos via API do ChEBI se tivermos o ID
        if chebi_id and chebi_id.startswith("CHEBI:"):
            chebi_url = f"https://www.ebi.ac.uk/webservices/chebi/2.0/test/getCompleteEntity?chebiId={chebi_id}"
            # Nota: A API REST do ChEBI é XML. Para JSON usamos a OLS4 como acima.
            # Se quiser manter JSON, o OLS4 já nos deu os ancestrais.
            pass

        blacklist = {"entity", "chemical entity", "material entity", "role", "has role", "is a", "chemical", "molecule"}
        filtrado = [c.strip() for c in classes if c and c.lower() not in blacklist]
        
        return list(set(filtrado))[:12]
    except:
        return []

# -------------------------------
# KEGG (BUSCA POR NOME MAIS FLEXÍVEL)
# -------------------------------
@lru_cache(maxsize=256)
def fetch_kegg(nome):
    try:
        # KEGG prefere buscas mais simples. Remova parênteses se falhar.
        nome_kegg = re.sub(r'\(.*?\)', '', nome).strip()
        r = safe_request(f"http://rest.kegg.jp/find/compound/{quote(nome_kegg)}")
        if not r or not r.text.strip(): return {"vias": []}

        lines = r.text.strip().split("\n")
        entry = lines[0].split("\t")[0].strip()

        r2 = safe_request(f"http://rest.kegg.jp/get/{entry}")
        if not r2: return {"vias": []}

        vias = []
        for line in r2.text.split("\n"):
            if line.startswith("PATHWAY"):
                vias.append(line.replace("PATHWAY", "").strip())
            elif line.startswith(" "): # Continuação de vias
                content = line.strip()
                if content and not content.startswith("cpd:"):
                    vias.append(content)
        return {"vias": vias}
    except:
        return {"vias": []}

# -------------------------------
# PROCESSAMENTO (STREAMLIT READY)
# -------------------------------

def clean_stereo_name(name):
    if not name or pd.isna(name): return ""
    # Remove stereochemical prefixes like (2E,6E,8S,9S,10R,11E,13R,14S)-
    cleaned = re.sub(r'^\([\w,′\u03be\u03b1\u03b2+-]+\)-', '', str(name), flags=re.UNICODE)
    cleaned = re.sub(r'^\(\w+[\u03be]*\)-', '', cleaned, flags=re.UNICODE)
    return cleaned.strip()
def selecionar_nome_facil(synonyms, fallback_name):
    primary_name = str(fallback_name).strip()
    
    # Heuristic: If the primary name is already reasonably short (<= 18 chars)
    # and is a simple alphabetic/alphanumeric name without complex chemical syntax, keep it!
    if len(primary_name) <= 18:
        if not any(char in primary_name for char in ['(', ')', '[', ']', '{', '}']):
            return primary_name

    if not synonyms:
        return primary_name
        
    candidates = []
    for syn in synonyms:
        syn_str = str(syn).strip()
        if not syn_str: continue
        
        syn_upper = syn_str.upper()
        if (syn_upper.startswith('DTXSID') or syn_upper.startswith('DTXCID') or 
            syn_upper.startswith('SCHEMBL') or syn_upper.startswith('CHEMBL') or 
            syn_upper.startswith('REFCHEM') or syn_upper.startswith('LMGP') or 
            syn_upper.startswith('LMPK') or syn_upper.startswith('CHEBI:') or 
            syn_upper.startswith('HMDB') or syn_upper.startswith('CSID')):
            continue
            
        if len(syn_str) <= 4:
            vowels = set("aeiouyAEIOUY")
            if not any(c in vowels for c in syn_str):
                continue
                
        if ':' in syn_str and not ('(' in syn_str and ':' in syn_str):
            continue
            
        if re.search(r'[A-Za-z]\d', syn_str) or re.search(r'\d[A-Za-z]', syn_str):
            if ' ' not in syn_str and '-' not in syn_str and '(' not in syn_str:
                continue
            if re.match(r'^[A-Za-z]{2,3}-\d+$', syn_str):
                continue
                
        candidates.append(syn_str)
        
    if not candidates:
        return primary_name
        
    def score_name(name):
        length = len(name)
        penalty = 0
        
        if '(' in name or ')' in name:
            if length < 20 and ':' in name:
                penalty -= 15 # heavy bonus for standard lipid abbreviations
            else:
                penalty += 30
        if '[' in name or ']' in name or '{' in name or '}' in name:
            penalty += 50
            
        clean_name = name.replace(' ', '').replace('-', '')
        if clean_name.isalpha():
            penalty -= 5
            
        if clean_name.isdigit():
            penalty += 100
            
        return length + penalty
        
    candidates.sort(key=score_name)
    best = candidates[0]
    
    # If the primary_name is already clean and similar length, keep it
    clean_primary = primary_name.replace(' ', '').replace('-', '')
    if len(clean_primary) <= len(best.replace(' ', '').replace('-', '')) + 2:
        if not any(char in primary_name for char in ['(', ')', '[', ']', '{', '}']):
            return primary_name
            
    return best

def extrair_dados_pug_view(cid):
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/{cid}/JSON"
    r = safe_request(url)
    default_vals = {
        "food_additives": "Não documentado",
        "uses": "Não documentado",
        "safety": "Não documentado",
        "toxicity": "Não documentado",
        "nci_code": "Não documentado",
        "mesh_class": "Não documentado"
    }
    if not r or r.status_code != 200:
        return default_vals
        
    try:
        data = r.json()
        record = data.get("Record", {})
        sections = record.get("Section", [])
    except:
        return default_vals
        
    extracted = {
        "food_additives": [],
        "uses": [],
        "safety": [],
        "toxicity": [],
        "nci_code": [],
        "mesh_class": []
    }
    
    def extract_text(info_list):
        text_blocks = []
        for info in info_list:
            val = info.get("Value", {})
            if "StringWithMarkup" in val:
                for item in val["StringWithMarkup"]:
                    string_val = item.get("String")
                    if string_val:
                        text_blocks.append(string_val)
        return text_blocks

    def scan(sec_list, parent_heading=""):
        for s in sec_list:
            heading = s.get("TOCHeading", "")
            current_path = f"{parent_heading} -> {heading}" if parent_heading else heading
            heading_lower = heading.lower()
            
            is_food = ("food additive" in heading_lower or 
                       "food additives and ingredients" in heading_lower or 
                       "substances added to food" in heading_lower)
                       
            is_uses = ("use and manufacturing" in heading_lower or 
                       "uses" == heading_lower or 
                       "therapeutic uses" in heading_lower or
                       "methods of manufacturing" in heading_lower)
                       
            is_safety = ("safety and hazards" in heading_lower or 
                         "hazards identification" in heading_lower or 
                         "ghs classification" in heading_lower or
                         "health hazards" in heading_lower or
                         "fire hazards" in heading_lower or
                         "hazards summary" in heading_lower)
                         
            is_toxicity = ("toxicity" == heading_lower or 
                           "toxicological information" in heading_lower or 
                           "toxicity summary" in heading_lower or
                           "human toxicity excerpts" in heading_lower or
                           "non-human toxicity excerpts" in heading_lower or
                           "human toxicity values" in heading_lower or
                           "non-human toxicity values" in heading_lower)
                           
            is_nci = "nci thesaurus code" in heading_lower
            is_mesh = "mesh pharmacological classification" in heading_lower
            
            info = s.get("Information", [])
            if info:
                texts = extract_text(info)
                if texts:
                    if is_food: extracted["food_additives"].extend(texts)
                    if is_uses: extracted["uses"].extend(texts)
                    if is_safety: extracted["safety"].extend(texts)
                    if is_toxicity: extracted["toxicity"].extend(texts)
                    if is_nci: extracted["nci_code"].extend(texts)
                    if is_mesh: extracted["mesh_class"].extend(texts)
            
            sub_sec = s.get("Section", [])
            if sub_sec:
                scan(sub_sec, current_path)
                
    scan(sections)
    
    res = {}
    for k in extracted:
        seen = set()
        cleaned = []
        for text in extracted[k]:
            clean_t = text.strip()
            if clean_t and clean_t not in seen:
                seen.add(clean_t)
                cleaned.append(clean_t)
                
        if cleaned:
            if k in ["nci_code", "mesh_class"]:
                res[k] = ", ".join(cleaned)
            else:
                res[k] = "\n\n".join(cleaned[:6])
        else:
            res[k] = "Não documentado"
            
    return res

def query_mesh_api(term):
    if not term or pd.isna(term):
        return "Não documentado"
    term_cleaned = re.sub(r'\s*\([^)]*\)', '', str(term)).strip()
    if not term_cleaned:
        return "Não documentado"
    url = f"https://id.nlm.nih.gov/mesh/lookup/descriptor?label={quote(term_cleaned)}"
    r = safe_request(url)
    if r:
        try:
            data = r.json()
            if isinstance(data, list) and len(data) > 0:
                first = data[0]
                resource_url = first.get("resource", "")
                mesh_id = resource_url.split("/")[-1] if "/" in resource_url else ""
                label = first.get("label", term_cleaned)
                if mesh_id:
                    return f"{label} (ID: {mesh_id})"
                return label
        except Exception as e:
            logging.error(f"Erro ao processar MeSH API para {term}: {e}")
    return "Não documentado"

def query_nci_api(term):
    if not term or pd.isna(term):
        return "Não documentado"
    term_cleaned = re.sub(r'\s*\([^)]*\)', '', str(term)).strip()
    if not term_cleaned:
        return "Não documentado"
    url = f"https://api-evsrest.nci.nih.gov/api/v1/concept/ncit/search?term={quote(term_cleaned)}"
    r = safe_request(url)
    if r:
        try:
            data = r.json()
            concepts = data.get("concepts", [])
            for c in concepts:
                name = c.get("name", "")
                code = c.get("code", "")
                if code and name.lower() == term_cleaned.lower():
                    return code
            if concepts:
                return concepts[0].get("code", "Não documentado")
        except Exception as e:
            logging.error(f"Erro ao processar NCI API para {term}: {e}")
    return "Não documentado"

def fetch_pubchem_by_cid(cid):
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/property/Title,MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES/JSON"
    r = safe_request(url)
    if not r: return None
    try:
        data = r.json()
        props = data["PropertyTable"]["Properties"][0]
    except (KeyError, IndexError):
        return None
        
    desc_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/description/JSON"
    d_res = safe_request(desc_url)
    
    syn_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/synonyms/JSON"
    s_res = safe_request(syn_url)
    synonyms = []
    if s_res:
        try:
            synonyms = s_res.json().get("InformationList", {}).get("Information", [{}])[0].get("Synonym", [])
        except: pass
        
    title = props.get("Title") or str(cid)
    nome_facil = selecionar_nome_facil(synonyms, title)
    
    # Mapeamento do PUG-View em paralelo/síncrono
    pug_view = extrair_dados_pug_view(cid)
    
    mesh_val = pug_view["mesh_class"]
    if not mesh_val or mesh_val == "Não documentado":
        mesh_val = query_mesh_api(nome_facil or title)
        
    nci_val = pug_view["nci_code"]
    if not nci_val or nci_val == "Não documentado":
        nci_val = query_nci_api(nome_facil or title)
    
    res = {
        "cid": cid,
        "titulo": title,
        "nome_facil": nome_facil,
        "synonyms": synonyms,
        "formula": props.get("MolecularFormula"),
        "massa": props.get("MolecularWeight"),
        "iupac": props.get("IUPACName"),
        "smiles": props.get("CanonicalSMILES"),
        "descricao": "Sem descrição",
        "aditivos_alimentares": pug_view["food_additives"],
        "aplicacoes": pug_view["uses"],
        "seguranca": pug_view["safety"],
        "toxicidade": pug_view["toxicity"],
        "nci_thesaurus": nci_val,
        "mesh_class": mesh_val
    }
    if d_res:
        try:
            descriptions = d_res.json().get("InformationList", {}).get("Information", [])
            for d in descriptions:
                if "Description" in d:
                    res["descricao"] = d["Description"]
                    break
        except: pass
    return res

def search_pubchem_by_name_or_id(query_str):
    if not query_str or pd.isna(query_str): return []
    encoded = quote(str(query_str).strip())
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded}/cids/JSON"
    r = safe_request(url)
    if r:
        try: return r.json().get("IdentifierList", {}).get("CID", [])
        except: pass
        
    url_word = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded}/cids/JSON?name_type=word"
    r_word = safe_request(url_word)
    if r_word:
        try: return r_word.json().get("IdentifierList", {}).get("CID", [])
        except: pass
    return []

def search_pubchem_by_formula(formula_str):
    if not formula_str or pd.isna(formula_str): return []
    encoded = quote(str(formula_str).strip())
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastformula/{encoded}/cids/JSON"
    r = safe_request(url)
    if r:
        try: return r.json().get("IdentifierList", {}).get("CID", [])
        except: pass
    return []

def fetch_chebi_by_any(query_str):
    if not query_str or pd.isna(query_str): return []
    try:
        cleaned_query = clean_stereo_name(str(query_str))
        search_url = f"https://www.ebi.ac.uk/ols4/api/search?q={quote(cleaned_query)}&ontology=chebi&type=class&rows=5"
        r = safe_request(search_url)
        if not r: return []
        docs = r.json().get("response", {}).get("docs", [])
        labels = []
        for d in docs:
            lbl = d.get("label")
            if lbl: labels.append(lbl)
        return list(set(labels))
    except:
        return []

def resolve_by_formula_candidates(cids, formula_str, name_busca):
    if not cids: return None
    cids_str = ",".join(map(str, cids))
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cids_str}/property/Title,MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES/JSON"
    r = safe_request(url)
    if not r: return None
    try:
        props = r.json().get("PropertyTable", {}).get("Properties", [])
    except:
        return None
        
    if not props: return None
    
    best_candidate = None
    best_score = -1
    target_name = clean_stereo_name(str(name_busca)).lower()
    
    for p in props:
        cid = p.get("CID")
        title = str(p.get("Title", "")).lower()
        iupac = str(p.get("IUPACName", "")).lower()
        
        score = 0
        if target_name:
            target_words = set(re.findall(r'\w+', target_name))
            cand_words = set(re.findall(r'\w+', title)).union(set(re.findall(r'\w+', iupac)))
            if target_words:
                score = len(target_words.intersection(cand_words)) / len(target_words)
                
        if score > best_score:
            best_score = score
            best_candidate = p
            
    if best_candidate:
        desc_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{best_candidate['CID']}/description/JSON"
        d_res = safe_request(desc_url)
        desc = "Sem descrição"
        if d_res:
            try:
                descriptions = d_res.json().get("InformationList", {}).get("Information", [])
                for d in descriptions:
                    if "Description" in d:
                        desc = d["Description"]
                        break
            except: pass
        return {
            "cid": best_candidate.get("CID"),
            "titulo": best_candidate.get("Title"),
            "formula": best_candidate.get("MolecularFormula"),
            "massa": best_candidate.get("MolecularWeight"),
            "iupac": best_candidate.get("IUPACName"),
            "smiles": best_candidate.get("CanonicalSMILES"),
            "descricao": desc
        }
    return None

def buscar_composto(nome):
    # Mantido para retrocompatibilidade
    if not isinstance(nome, str) or not nome.strip() or nome.lower() == 'nan':
        return None
    nome_limpo = re.sub(r'\s+', ' ', nome).strip()
    encoded = quote(nome_limpo)
    url_exact = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded}/cids/JSON"
    if safe_request(url_exact):
        return nome_limpo
    search_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded}/cids/JSON?name_type=word"
    r = safe_request(search_url)
    if r:
        return nome_limpo
def estimar_ionizacao(smiles):
    if not smiles or not isinstance(smiles, str):
        return "Neutra"
    if "+" in smiles and "-" in smiles:
        return "Zwitteriônica"
    if "+" in smiles:
        return "Catiônica"
    if "-" in smiles:
        return "Aniônica"
    return "Neutra"

def estimar_metabolismo(vias):
    if not vias:
        return "Desconhecido"
    keywords = ["Metabolism", "Biosynthesis", "Degradation", "Cycle", "Pathway"]
    for v in vias:
        if any(kw.lower() in v.lower() for kw in keywords):
            return "Metabólito Ativo"
    return "Envolvido em Vias"

def integrar(nome):
    # Versão adaptada para retrocompatibilidade de chamadas legadas
    return integrar_composto(nome)

def integrar_composto(nome_busca, compound_id=None, formula=None):
    if (not nome_busca or pd.isna(nome_busca)) and (not compound_id or pd.isna(compound_id)):
        return None
        
    cache_key = f"{str(nome_busca)}||{str(compound_id)}||{str(formula)}"
    cached = db.obter_composto_cache(cache_key)
    if cached is not False:
        if cached:
            if 'Nome_Facil' not in cached:
                cached['Nome_Facil'] = cached.get('Composto', nome_busca)
            
            # Enriquecimento dinâmico de cache antigo
            novos_campos = ["Aditivos_Alimentares", "Aplicacoes", "Seguranca", "Toxicidade", "MeSH_Class", "NCI_Thesaurus"]
            if any(f not in cached for f in novos_campos):
                cid_val = cached.get("ID")
                if cid_val and str(cid_val).strip() and str(cid_val) != 'None' and str(cid_val) != 'Não localizado':
                    try:
                        pubchem_data = fetch_pubchem_by_cid(int(cid_val))
                        if pubchem_data:
                            cached["Aditivos_Alimentares"] = pubchem_data.get("aditivos_alimentares", "Não documentado")
                            cached["Aplicacoes"] = pubchem_data.get("aplicacoes", "Não documentado")
                            cached["Seguranca"] = pubchem_data.get("seguranca", "Não documentado")
                            cached["Toxicidade"] = pubchem_data.get("toxicidade", "Não documentado")
                            cached["MeSH_Class"] = pubchem_data.get("mesh_class", "Não documentado")
                            cached["NCI_Thesaurus"] = pubchem_data.get("nci_thesaurus", "Não documentado")
                            db.salvar_composto_cache(cache_key, cached)
                    except Exception as e:
                        logging.error(f"Erro ao enriquecer cache antigo para CID {cid_val}: {e}")
                
                # Preencher fallbacks em caso de falha de ID ou rede
                for f in novos_campos:
                    if f not in cached:
                        cached[f] = "Não documentado"
        return cached

    cid = None
    pubchem_data = None

    # Estágio 1: ID Numérico Direto do PubChem
    if compound_id and str(compound_id).strip().isdigit():
        cid = int(str(compound_id).strip())
        pubchem_data = fetch_pubchem_by_cid(cid)

    # Estágio 2: Sinônimo direto no PubChem (CSID / HMDB)
    if not pubchem_data and compound_id and not pd.isna(compound_id):
        comp_id_str = str(compound_id).strip()
        cids = search_pubchem_by_name_or_id(comp_id_str)
        if cids:
            pubchem_data = fetch_pubchem_by_cid(cids[0])
            
        if not pubchem_data and comp_id_str.startswith('CSID'):
            csid_num = comp_id_str.replace('CSID', '')
            cids_num = search_pubchem_by_name_or_id(csid_num)
            if cids_num:
                pubchem_data = fetch_pubchem_by_cid(cids_num[0])

    # Estágio 3: Busca por Descrição / Nome Original
    if not pubchem_data and nome_busca and not pd.isna(nome_busca):
        name_str = str(nome_busca).strip()
        if name_str and name_str.lower() != 'nan':
            cids = search_pubchem_by_name_or_id(name_str)
            if cids:
                pubchem_data = fetch_pubchem_by_cid(cids[0])

    # Estágio 4: Limpeza Estereoquímica
    if not pubchem_data and nome_busca and not pd.isna(nome_busca):
        name_str = str(nome_busca).strip()
        if name_str and name_str.lower() != 'nan':
            cleaned = clean_stereo_name(name_str)
            if cleaned != name_str:
                cids = search_pubchem_by_name_or_id(cleaned)
                if cids:
                    pubchem_data = fetch_pubchem_by_cid(cids[0])

    # Estágio 5: Ponte de busca no ChEBI OLS4
    chebi_ont = []
    if compound_id and not pd.isna(compound_id):
        chebi_ont = fetch_chebi_by_any(str(compound_id))
    if not chebi_ont and nome_busca and not pd.isna(nome_busca):
        chebi_ont = fetch_chebi_by_any(str(nome_busca))
        if not chebi_ont:
            chebi_ont = fetch_chebi_by_any(clean_stereo_name(str(nome_busca)))

    if not pubchem_data and chebi_ont:
        for label in chebi_ont[:3]:
            cids = search_pubchem_by_name_or_id(label)
            if cids:
                pubchem_data = fetch_pubchem_by_cid(cids[0])
                break

    # Estágio 6: Fallback de busca por fórmula e similaridade de nome
    if not pubchem_data and formula and not pd.isna(formula):
        formula_str = str(formula).strip()
        cids = search_pubchem_by_formula(formula_str)
        if cids:
            pubchem_data = resolve_by_formula_candidates(cids[:25], formula_str, nome_busca)

    if not pubchem_data:
        db.salvar_composto_cache(cache_key, None)
        return None

    # KEGG Metabolismo
    kegg = fetch_kegg(pubchem_data.get('titulo') or nome_busca or "")
    vias = kegg.get("vias", [])
    vias_joined = ", ".join(vias) if vias else "Não documentada"
    chebi_joined = ", ".join(chebi_ont) if chebi_ont else "Não classificado"

    resultado = {
        "ID": pubchem_data["cid"],
        "Composto": pubchem_data.get("titulo") or nome_busca,
        "Nome_Facil": pubchem_data.get("nome_facil") or selecionar_nome_facil(pubchem_data.get("synonyms", []), pubchem_data.get("titulo") or nome_busca),
        "Fórmula": pubchem_data["formula"] or formula or "Não localizado",
        "Massa": pubchem_data["massa"],
        "IUPAC": pubchem_data["iupac"] or "Não localizado",
        "Ionização": estimar_ionizacao(pubchem_data.get("smiles")),
        "Categoria química": chebi_joined,
        "Metabolismo": estimar_metabolismo(vias),
        "Vias metabólicas": vias_joined,
        "Ontologia (ChEBI)": chebi_ont,
        "Descricao": pubchem_data.get("descricao", "Sem descrição"),
        
        # Novas variáveis solicitadas
        "Aditivos_Alimentares": pubchem_data.get("aditivos_alimentares", "Não documentado"),
        "Aplicacoes": pubchem_data.get("aplicacoes", "Não documentado"),
        "Seguranca": pubchem_data.get("seguranca", "Não documentado"),
        "Toxicidade": pubchem_data.get("toxicidade", "Não documentado"),
        "MeSH_Class": pubchem_data.get("mesh_class", "Não documentado"),
        "NCI_Thesaurus": pubchem_data.get("nci_thesaurus", "Não documentado")
    }

    db.salvar_composto_cache(cache_key, resultado)
    return resultado

def processar_planilhas(id_path, abund_path, top_n=100, progress_callback=None):
    try:
        df_id = pd.read_excel(id_path)
        df_abund = pd.read_excel(abund_path)
    except Exception as e:
        logging.error(f"Erro ao ler excel: {e}")
        return pd.DataFrame()

    if 'Compound' not in df_id.columns or 'Compound' not in df_abund.columns:
        col_id = [c for c in df_id.columns if 'compound' in c.lower() or 'nome' in c.lower()]
        col_abund = [c for c in df_abund.columns if 'compound' in c.lower() or 'nome' in c.lower()]
        if col_id and col_abund:
            df_id.rename(columns={col_id[0]: 'Compound'}, inplace=True)
            df_abund.rename(columns={col_abund[0]: 'Compound'}, inplace=True)
        else:
            logging.error("Coluna de cruzamento não encontrada.")
            return pd.DataFrame()

    df_merge = pd.merge(df_id, df_abund, on='Compound', how='inner')

    df_merge['Fragmentation Score'] = pd.to_numeric(df_merge['Fragmentation Score'], errors='coerce').fillna(0.0)
    df_merge['Isotope Similarity'] = pd.to_numeric(df_merge['Isotope Similarity'], errors='coerce').fillna(0.0)
    df_merge['Mass Error (ppm)'] = pd.to_numeric(df_merge['Mass Error (ppm)'], errors='coerce').fillna(0.0)
    df_merge['Score'] = pd.to_numeric(df_merge['Score'], errors='coerce').fillna(0.0)
    df_merge['Mass Error Abs'] = df_merge['Mass Error (ppm)'].abs()
    
    # Priority sorting helper to pick candidate with direct numeric PubChem CID if available
    df_merge['Has_Numeric_ID'] = df_merge['Compound ID'].apply(lambda x: 0 if str(x).strip().isdigit() else 1)

    # 4. Ordenação e Remoção de Duplicatas de Picos Cromatográficos
    # Primeiro ordenamos todas as correspondências seguindo a Escadinha Biológica + Prioridade de ID
    df_sorted = df_merge.sort_values(
        by=['Fragmentation Score', 'Isotope Similarity', 'Mass Error Abs', 'Score', 'Has_Numeric_ID'],
        ascending=[False, False, True, False, True]
    )
    
    # Removemos duplicatas mantendo apenas o melhor candidato estrutural para cada pico 'Compound'
    df_unique = df_sorted.drop_duplicates(subset=['Compound'], keep='first')
    
    # Selecionamos os top_n picos cromatográficos finais
    df_top = df_unique.head(top_n).copy()
    
    total = len(df_top)
    if total == 0:
        return pd.DataFrame()
        
    jobs = []
    for i, (_, row) in enumerate(df_top.iterrows()):
        nome_busca = row.get('Description', row.get('Description_x', row.get('Description_y', row['Compound'])))
        if pd.isna(nome_busca):
            nome_busca = row['Compound']
            
        nome = row['Compound']
        mz_val = row.get('m/z', row.get('m/z_x', row.get('m/z_y', 0)))
        rt_val = row.get('Retention time (min)', row.get('Retention time (min)_x', row.get('Retention time (min)_y', 0)))
        comp_id = row.get('Compound ID', row.get('Compound ID_x', row.get('Compound ID_y', None)))
        formula = row.get('Formula', row.get('Formula_x', row.get('Formula_y', None)))
        
        jobs.append({
            'nome_busca': nome_busca,
            'nome': nome,
            'mz_val': mz_val,
            'rt_val': rt_val,
            'comp_id': comp_id,
            'formula': formula,
            'frag_score': row.get('Fragmentation Score', 0.0),
            'iso_similarity': row.get('Isotope Similarity', 0.0),
            'mass_error': row.get('Mass Error (ppm)', 0.0),
            'score': row.get('Score', 0.0),
            'row': row
        })
        
    resultados = [None] * total
    progress_lock = threading.Lock()
    completed = 0
    
    def process_job(idx, job):
        nonlocal completed
        try:
            info_bio = integrar_composto(job['nome_busca'], job['comp_id'], job['formula'])
            
            formula_excel = job['row'].get('Formula', job['row'].get('Formula_x', job['row'].get('Formula_y', 'Não localizado')))
            if pd.isna(formula_excel):
                formula_excel = 'Não localizado'
                
            massa_excel = job['row'].get('Neutral mass (Da)', job['row'].get('Neutral mass (Da)_x', job['row'].get('Neutral mass (Da)_y', 0.0)))
            if pd.isna(massa_excel) or massa_excel == 0.0:
                massa_excel = job['mz_val']
            
            res = {
                "ID": None,
                "Composto": job['nome_busca'],
                "Nome_Facil": job['nome_busca'],
                "Fórmula": formula_excel,
                "Massa": massa_excel,
                "IUPAC": "Não localizado",
                "Ionização": "Desconhecida",
                "Categoria química": "Não classificado",
                "Metabolismo": "Desconhecido",
                "Vias metabólicas": "Não documentada",
                "Descricao": "Não localizado em bancos biológicos",
                "Aditivos_Alimentares": "Não documentado",
                "Aplicacoes": "Não documentado",
                "Seguranca": "Não documentado",
                "Toxicidade": "Não documentado",
                "MeSH_Class": "Não documentado",
                "NCI_Thesaurus": "Não documentado",
                "Raw_API_Data": {}
            }
            
            if info_bio:
                res.update(info_bio)
                res['Raw_API_Data'] = info_bio
                if not res.get('Fórmula') or res.get('Fórmula') == 'Não localizado':
                    res['Fórmula'] = formula_excel
                if pd.isna(res.get('Massa')) or res.get('Massa') == 0.0:
                    res['Massa'] = massa_excel
            
            res['m/z'] = job['mz_val']
            res['Retention time (min)'] = job['rt_val']
            res['Fragmentation Score'] = job['frag_score']
            res['Isotope Similarity'] = job['iso_similarity']
            res['Mass Error (ppm)'] = job['mass_error']
            res['Score'] = job['score']
            
            resultados[idx] = res
        except Exception as e:
            logging.error(f"Erro ao integrar composto {job['nome_busca']}: {e}")
            formula_excel = job['row'].get('Formula', job['row'].get('Formula_x', job['row'].get('Formula_y', 'Erro de processamento')))
            if pd.isna(formula_excel):
                formula_excel = 'Erro de processamento'
            massa_excel = job['row'].get('Neutral mass (Da)', job['row'].get('Neutral mass (Da)_x', job['row'].get('Neutral mass (Da)_y', 0.0)))
            if pd.isna(massa_excel) or massa_excel == 0.0:
                massa_excel = job['mz_val']
            resultados[idx] = {
                "ID": None,
                "Composto": job['nome_busca'],
                "Nome_Facil": job['nome_busca'],
                "Fórmula": formula_excel,
                "Massa": massa_excel,
                "m/z": job['mz_val'],
                "Retention time (min)": job['rt_val'],
                "Fragmentation Score": job['frag_score'],
                "Isotope Similarity": job['iso_similarity'],
                "Mass Error (ppm)": job['mass_error'],
                "Score": job['score'],
                "IUPAC": "Erro de processamento",
                "Ionização": "Desconhecida",
                "Categoria química": "Não classificado",
                "Metabolismo": "Desconhecido",
                "Vias metabólicas": "Não documentada",
                "Descricao": f"Falha interna: {str(e)}",
                "Aditivos_Alimentares": "Não documentado",
                "Aplicacoes": "Não documentado",
                "Seguranca": "Não documentado",
                "Toxicidade": "Não documentado",
                "MeSH_Class": "Não documentado",
                "NCI_Thesaurus": "Não documentado",
                "Raw_API_Data": {}
            }
        finally:
            with progress_lock:
                completed += 1
                if progress_callback:
                    try:
                        progress_callback(completed, total, job['nome_busca'])
                    except Exception as cb_err:
                        logging.error(f"Erro no progress_callback: {cb_err}")

    max_workers = min(15, total)
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = [pool.submit(process_job, idx, job) for idx, job in enumerate(jobs)]
        for f in futures:
            f.result()

    final_df = pd.DataFrame([r for r in resultados if r is not None])
    
    if final_df.empty: return final_df
    
    final_df['Mass Error Abs'] = final_df['Mass Error (ppm)'].abs()
    
    # Priority sorting: Successful PubChem ID matches first (Has_ID_Priority = 0)
    final_df['Has_ID_Priority'] = final_df['ID'].apply(lambda x: 0 if x and str(x).strip() and str(x) != 'None' and str(x) != 'Não localizado' else 1)
    
    final_df = final_df.sort_values(
        by=['Fragmentation Score', 'Isotope Similarity', 'Mass Error Abs', 'Score', 'Has_ID_Priority'],
        ascending=[False, False, True, False, True]
    ).drop(columns=['Mass Error Abs', 'Has_ID_Priority'])
    return final_df