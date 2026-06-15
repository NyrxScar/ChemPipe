import requests
from urllib.parse import quote

def get_syns(nome):
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{quote(nome)}/cids/JSON"
    r = requests.get(url)
    if r.status_code == 200:
        cid = r.json()["IdentifierList"]["CID"][0]
        url_s = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/synonyms/JSON"
        rs = requests.get(url_s)
        if rs.status_code == 200:
            syns = rs.json().get("InformationList", {}).get("Information", [])[0].get("Synonym", [])
            print(f"Syns for {nome}:")
            print(syns[:10])

get_syns("1-[(E)-(4-Nitrophenyl)diazenyl]-3,6-dihydropyrrolo[3,2-e]indole")
