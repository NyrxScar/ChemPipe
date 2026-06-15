import re
import requests

def safe_request(url):
    return requests.get(url)

def nome_eh_complexo(nome):
    if not nome: return False
    especiais = sum(1 for c in nome if not c.isalpha() and c not in ' ')
    if (especiais / len(nome) > 0.15) or len(nome) > 40:
        return True
    return False

def simplificar_nome(cid, titulo_original):
    if not nome_eh_complexo(titulo_original):
        return titulo_original
        
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/synonyms/JSON"
    r = safe_request(url)
    if not r or r.status_code != 200: return titulo_original
    
    try:
        syns = r.json().get("InformationList", {}).get("Information", [])[0].get("Synonym", [])
        
        candidatos = []
        for s in syns:
            if re.match(r'^[\d\-]+$', s) or re.match(r'^[A-Z0-9]+$', s) or "CHEBI" in s or "RefChem" in s:
                continue
            if not nome_eh_complexo(s) and len(s) > 3:
                candidatos.append(s)
                
        if candidatos:
            # Pega o candidato mais curto
            return min(candidatos, key=len)
    except Exception as e:
        print("Erro:", e)
        
    return titulo_original

print(simplificar_nome(2519, "Caffeine")) # should not query
print(simplificar_nome(15923485, "Xanthene, 9,9-dimethyl-4,5-bis(diphenylphosphinyl)-"))
print(simplificar_nome(11485656, "3-(4-methylphenyl)-5-(3-pyridin-2-yl-1,2,4-oxadiazol-5-yl)-1,2,4-oxadiazole"))
