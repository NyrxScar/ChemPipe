import requests

def get_best_name(cid):
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/synonyms/JSON"
    r = requests.get(url)
    if r.status_code == 200:
        syns = r.json().get("InformationList", {}).get("Information", [])[0].get("Synonym", [])
        print(f"Top 5 synonyms for {cid}:", syns[:5])
        
        # Heuristica para nome popular: pegar o mais curto que nao tenha muito numero/traco
        for s in syns:
            if len(s) < 30 and sum(c.isdigit() or c in '-(),[]' for c in s) < 3:
                print("BEST NAME:", s)
                return s
        print("BEST NAME (fallback):", syns[0] if syns else "None")

get_best_name(2244) # Aspirin
get_best_name(1983) # Acetaminophen
