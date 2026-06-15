import pandas as pd
import requests
import time
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from urllib.parse import quote

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

def integrar(nome):
    if not nome or pd.isna(nome): return None
    
    nome_valido = buscar_composto(str(nome))
    if not nome_valido: return None

    # Rodar APIs em paralelo para velocidade
    with ThreadPoolExecutor(max_workers=3) as executor:
        f_pub = executor.submit(fetch_pubchem, nome_valido)
        f_kegg = executor.submit(fetch_kegg, nome_valido)
        f_chebi = executor.submit(fetch_chebi, nome_valido)

        pub = f_pub.result()
        if not pub: return None # PubChem é nossa âncora

        kegg = f_kegg.result()
        chebi = f_chebi.result()

    vias = kegg.get("vias", [])
    vias_joined = ", ".join(vias) if vias else "Não documentada"
    chebi_joined = ", ".join(chebi) if chebi else "Não classificado"

    return {
        "ID": pub["cid"],
        "Composto": pub.get("titulo") or nome_valido,
        "Fórmula": pub["formula"],
        "Massa": pub["massa"],
        "IUPAC": pub["iupac"],
        "Ionização": estimar_ionizacao(pub.get("smiles")),
        "Categoria química": chebi_joined,
        "Metabolismo": estimar_metabolismo(vias),
        "Vias metabólicas": vias_joined,
        "Ontologia (ChEBI)": chebi,
        "Descricao": pub.get("descricao", "Sem descrição")
    }


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

def processar_planilhas(id_path, abund_path, top_n=100, progress_callback=None):
    # 1. Carregar Planilhas
    try:
        df_id = pd.read_excel(id_path)
        df_abund = pd.read_excel(abund_path)
    except Exception as e:
        logging.error(f"Erro ao ler excel: {e}")
        return pd.DataFrame()

    # 2. Limpeza e Merge
    # Supondo que a coluna comum seja 'Compound'
    if 'Compound' not in df_id.columns or 'Compound' not in df_abund.columns:
        # Tenta encontrar colunas similares se 'Compound' não estiver lá
        col_id = [c for c in df_id.columns if 'compound' in c.lower() or 'nome' in c.lower()]
        col_abund = [c for c in df_abund.columns if 'compound' in c.lower() or 'nome' in c.lower()]
        if col_id and col_abund:
            df_id.rename(columns={col_id[0]: 'Compound'}, inplace=True)
            df_abund.rename(columns={col_abund[0]: 'Compound'}, inplace=True)
        else:
            logging.error("Coluna de cruzamento não encontrada.")
            return pd.DataFrame()

    # 3. Cálculo de Intensidade Média (Score Base) ANTES do merge para evitar KeyError com sufixos
    cols_ignorar = {'Compound', 'm/z', 'Retention time (min)', 'Formula', 'Adduct', 'Neutral mass (Da)'}
    cols_numericas = []
    
    for c in df_abund.columns:
        nm = c.lower()
        # Ignora colunas que são obviamente metadados e não intensidade
        if 'm/z' in nm or 'mass' in nm or 'min' in nm or 'retention' in nm or 'formula' in nm:
            continue
        if c not in cols_ignorar and pd.api.types.is_numeric_dtype(df_abund[c]):
            cols_numericas.append(c)
    
    if cols_numericas:
        df_abund['Score Base'] = df_abund[cols_numericas].mean(axis=1)
    else:
        df_abund['Score Base'] = 0.0

    df_merge = pd.merge(df_id, df_abund, on='Compound', how='inner')

    # 4. Selecionar Top N por Intensidade
    df_top = df_merge.sort_values(by='Score Base', ascending=False).head(top_n).copy()
    
    resultados = []
    total = len(df_top)
    
    for i, (_, row) in enumerate(df_top.iterrows()):
        # Usa a coluna Description (onde está o nome real) ou cai para Compound
        nome_busca = row.get('Description', row.get('Description_x', row.get('Description_y', row['Compound'])))
        if pd.isna(nome_busca):
            nome_busca = row['Compound']
            
        nome = row['Compound'] # Mantém o nome original (ID da feature) para salvar na planilha final
        
        if progress_callback:
            progress_callback(i + 1, total)
        
        info_bio = integrar(nome_busca)
        
        if info_bio:
            # Enriquecer com dados da planilha original (lidando com possíveis sufixos _x e _y do merge)
            res = info_bio.copy()
            mz_val = row.get('m/z', row.get('m/z_x', row.get('m/z_y', 0)))
            rt_val = row.get('Retention time (min)', row.get('Retention time (min)_x', row.get('Retention time (min)_y', 0)))
            
            res['m/z'] = mz_val
            res['Retention time (min)'] = rt_val
            res['Score Base'] = row.get('Score Base', 0)
            
            # Cálculo de Score Biológico (Bônus)
            bonus = 0
            if info_bio.get("Vias metabólicas") != "Não documentada": bonus += 30
            if info_bio.get("Categoria química") != "Não classificado": bonus += 20
            if info_bio.get("Descricao") != "Sem descrição": bonus += 10
            
            res['Bonus Biologico'] = bonus
            res['Score Compatibilidade'] = res['Score Base'] + (bonus * (res['Score Base'] / 100 if res['Score Base'] > 0 else 1))
            res['Raw_API_Data'] = info_bio # Para o banco de dados salvar o JSON completo
            
            resultados.append(res)
        else:
            # Se não encontrar na biologia, mantém todos os campos com valores padrão
            mz_val = row.get('m/z', row.get('m/z_x', row.get('m/z_y', 0)))
            rt_val = row.get('Retention time (min)', row.get('Retention time (min)_x', row.get('Retention time (min)_y', 0)))
            resultados.append({
                "ID": None,
                "Composto": nome_busca,
                "Fórmula": "Não localizado",
                "Massa": 0.0,
                "m/z": mz_val,
                "Retention time (min)": rt_val,
                "IUPAC": "Não localizado",
                "Ionização": "Desconhecida",
                "Categoria química": "Não classificado",
                "Metabolismo": "Desconhecido",
                "Vias metabólicas": "Não documentada",
                "Descricao": "Não localizado em bancos biológicos",
                "Score Base": row.get("Score Base", 0),
                "Bonus Biologico": 0,
                "Score Compatibilidade": row.get("Score Base", 0),
                "Raw_API_Data": {}
            })

    final_df = pd.DataFrame(resultados)
    
    # Se o DataFrame estiver vazio ou sem a coluna de score, retorna vazio
    if final_df.empty: return final_df
    
    # Garantir que temos o Score Compatibilidade para o ranking final
    if 'Score Compatibilidade' in final_df.columns:
        final_df = final_df.sort_values(by='Score Compatibilidade', ascending=False)
    
    return final_df