import sqlite3
import json
import threading
from datetime import datetime
import pandas as pd

DB_NAME = 'dados_analise_v2.db'
db_lock = threading.Lock()

def get_connection():
    return sqlite3.connect(DB_NAME)

def init_db():
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS analises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data_hora TEXT,
            nome_arquivo_identificacao TEXT,
            nome_arquivo_abundancia TEXT
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS resultados_compostos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analise_id INTEGER,
            cid TEXT,
            composto TEXT,
            descricao TEXT,
            formula TEXT,
            massa REAL,
            m_z REAL,
            retention_time REAL,
            score_base REAL,
            score_biologico REAL,
            score_total REAL,
            iupac TEXT,
            ionizacao TEXT,
            categoria_quimica TEXT,
            metabolismo TEXT,
            vias TEXT,
            json_completo TEXT,
            FOREIGN KEY (analise_id) REFERENCES analises (id)
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS compound_cache (
            nome TEXT PRIMARY KEY,
            resultado_json TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        conn.commit()
        conn.close()

def obter_composto_cache(nome):
    with db_lock:
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT resultado_json FROM compound_cache WHERE nome = ?', (nome,))
            row = cursor.fetchone()
            conn.close()
            if row and row[0]:
                return json.loads(row[0])
            return False
        except Exception:
            return False

def salvar_composto_cache(nome, resultado):
    with db_lock:
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute('''
            INSERT OR REPLACE INTO compound_cache (nome, resultado_json)
            VALUES (?, ?)
            ''', (nome, json.dumps(resultado)))
            conn.commit()
            conn.close()
        except Exception:
            pass

def tratar_float(valor):
    try:
        return float(valor)
    except (ValueError, TypeError):
        return 0.0

def salvar_analise(nome_identificacao, nome_abundancia, resultados_df):
    conn = get_connection()
    cursor = conn.cursor()
    
    data_hora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute('''
    INSERT INTO analises (data_hora, nome_arquivo_identificacao, nome_arquivo_abundancia)
    VALUES (?, ?, ?)
    ''', (data_hora, nome_identificacao, nome_abundancia))
    
    analise_id = cursor.lastrowid
    
    for _, row in resultados_df.iterrows():
        # Converte para dicionário e trata valores nulos/NaN para serializar corretamente
        row_dict = row.fillna("").to_dict()
        
        cursor.execute('''
        INSERT INTO resultados_compostos (
            analise_id, cid, composto, descricao, formula, massa, m_z, retention_time,
            score_base, score_biologico, score_total, iupac, ionizacao, categoria_quimica, metabolismo,
            vias, json_completo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            analise_id,
            str(row.get('ID', '')),
            str(row.get('Composto', '')),
            str(row.get('Descricao', '')),
            str(row.get('Fórmula', '')),
            tratar_float(row.get('Massa', 0)),
            tratar_float(row.get('m/z', 0)),
            tratar_float(row.get('Retention time (min)', 0)),
            tratar_float(row.get('Score', 0)),
            tratar_float(row.get('Fragmentation Score', 0)),
            tratar_float(row.get('Isotope Similarity', 0)),
            str(row.get('IUPAC', '')),
            str(row.get('Ionização', '')),
            str(row.get('Categoria química', '')),
            str(row.get('Metabolismo', '')),
            str(row.get('Vias metabólicas', '')),
            json.dumps(row_dict)
        ))
        
    conn.commit()
    conn.close()
    return analise_id

def carregar_dados_analise(analise_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT json_completo, composto, formula, massa, m_z, retention_time, 
               score_base, score_biologico, score_total, iupac, ionizacao, 
               categoria_quimica, metabolismo, vias, cid, descricao 
        FROM resultados_compostos 
        WHERE analise_id = ?
    ''', (analise_id,))
    rows = cursor.fetchall()
    conn.close()
    
    resultados = []
    for r in rows:
        # Tenta carregar o JSON completo que preserva as chaves originais
        if r[0] and r[0].strip().startswith('{'):
            try:
                resultados.append(json.loads(r[0]))
                continue
            except Exception:
                pass
        
        # Fallback de reconstrução caso seja um registro antigo/incompleto
        resultados.append({
            "ID": r[14],  # cid
            "Composto": r[1],
            "Fórmula": r[2],
            "Massa": r[3],
            "m/z": r[4],
            "Retention time (min)": r[5],
            "Score": r[6],  # score_base
            "Fragmentation Score": r[7],  # score_biologico
            "Isotope Similarity": r[8],  # score_total
            "IUPAC": r[9],
            "Ionização": r[10],
            "Categoria química": r[11],
            "Metabolismo": r[12],
            "Vias metabólicas": r[13],
            "Descricao": r[15],
            "Raw_API_Data": {}
        })
        
    if resultados:
        return pd.DataFrame(resultados)
    return pd.DataFrame()

def listar_analises():
    conn = get_connection()
    df = pd.read_sql_query("SELECT * FROM analises ORDER BY id DESC", conn)
    conn.close()
    return df

def obter_estatisticas_dashboard():
    conn = get_connection()
    cursor = conn.cursor()
    stats = {}

    # Total de análises
    cursor.execute("SELECT COUNT(*) FROM analises")
    stats["total_analises"] = cursor.fetchone()[0]

    # Total de compostos registrados
    cursor.execute("SELECT COUNT(*) FROM resultados_compostos")
    stats["total_compostos"] = cursor.fetchone()[0]

    # Compostos únicos (por nome)
    cursor.execute("SELECT COUNT(DISTINCT composto) FROM resultados_compostos WHERE composto != ''")
    stats["compostos_unicos"] = cursor.fetchone()[0]

    # Total em cache
    cursor.execute("SELECT COUNT(*) FROM compound_cache")
    stats["total_cache"] = cursor.fetchone()[0]

    # Última análise
    cursor.execute("SELECT data_hora FROM analises ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    stats["ultima_analise"] = row[0] if row else None

    # Distribuição por categoria química (top 10)
    cursor.execute("""
        SELECT categoria_quimica, COUNT(*) as cnt
        FROM resultados_compostos
        WHERE categoria_quimica != '' AND categoria_quimica != 'Não classificado' AND categoria_quimica != 'Não categorizado'
        GROUP BY categoria_quimica
        ORDER BY cnt DESC
        LIMIT 10
    """)
    stats["dist_categoria"] = [{"nome": r[0], "total": r[1]} for r in cursor.fetchall()]

    # Distribuição por ionização
    cursor.execute("""
        SELECT ionizacao, COUNT(*) as cnt
        FROM resultados_compostos
        WHERE ionizacao != ''
        GROUP BY ionizacao
        ORDER BY cnt DESC
    """)
    stats["dist_ionizacao"] = [{"nome": r[0], "total": r[1]} for r in cursor.fetchall()]

    # Distribuição por metabolismo
    cursor.execute("""
        SELECT metabolismo, COUNT(*) as cnt
        FROM resultados_compostos
        WHERE metabolismo != ''
        GROUP BY metabolismo
        ORDER BY cnt DESC
    """)
    stats["dist_metabolismo"] = [{"nome": r[0], "total": r[1]} for r in cursor.fetchall()]

    # Top 20 compostos por score (ranking global) - usa json_completo para dados ricos
    cursor.execute("""
        SELECT json_completo, composto, score_base, score_biologico, score_total, 
               massa, m_z, retention_time, cid, formula, ionizacao, categoria_quimica,
               metabolismo, vias, iupac, descricao
        FROM resultados_compostos
        WHERE composto != ''
        ORDER BY score_base DESC, score_biologico DESC, score_total DESC
        LIMIT 20
    """)
    ranking = []
    for r in cursor.fetchall():
        item = None
        if r[0] and r[0].strip().startswith('{'):
            try:
                item = json.loads(r[0])
            except Exception:
                pass
        if not item:
            item = {
                "Composto": r[1], "Score": r[2], "Fragmentation Score": r[3],
                "Isotope Similarity": r[4], "Massa": r[5], "m/z": r[6],
                "Retention time (min)": r[7], "ID": r[8], "Fórmula": r[9],
                "Ionização": r[10], "Categoria química": r[11],
                "Metabolismo": r[12], "Vias metabólicas": r[13],
                "IUPAC": r[14], "Descricao": r[15]
            }
        ranking.append(item)
    stats["ranking"] = ranking

    # Histórico recente (últimas 5 análises)
    cursor.execute("""
        SELECT a.id, a.data_hora, a.nome_arquivo_identificacao, a.nome_arquivo_abundancia,
               (SELECT COUNT(*) FROM resultados_compostos rc WHERE rc.analise_id = a.id) as num_compostos
        FROM analises a
        ORDER BY a.id DESC
        LIMIT 5
    """)
    stats["analises_recentes"] = [
        {"id": r[0], "data_hora": r[1], "arquivo_id": r[2], "arquivo_abund": r[3], "num_compostos": r[4]}
        for r in cursor.fetchall()
    ]

    conn.close()
    return stats

def pesquisar_compostos_global(termo):
    conn = get_connection()
    cursor = conn.cursor()
    like_term = f"%{termo}%"
    cursor.execute("""
        SELECT DISTINCT json_completo, composto, formula, massa, m_z, retention_time,
               score_base, score_biologico, score_total, iupac, ionizacao,
               categoria_quimica, metabolismo, vias, cid, descricao
        FROM resultados_compostos
        WHERE composto LIKE ? OR formula LIKE ? OR categoria_quimica LIKE ? OR iupac LIKE ? OR cid LIKE ?
        ORDER BY score_base DESC
        LIMIT 30
    """, (like_term, like_term, like_term, like_term, like_term))
    rows = cursor.fetchall()
    conn.close()

    resultados = []
    for r in rows:
        if r[0] and r[0].strip().startswith('{'):
            try:
                resultados.append(json.loads(r[0]))
                continue
            except Exception:
                pass
        resultados.append({
            "ID": r[14], "Composto": r[1], "Fórmula": r[2], "Massa": r[3],
            "m/z": r[4], "Retention time (min)": r[5], "Score": r[6],
            "Fragmentation Score": r[7], "Isotope Similarity": r[8],
            "IUPAC": r[9], "Ionização": r[10], "Categoria química": r[11],
            "Metabolismo": r[12], "Vias metabólicas": r[13], "Descricao": r[15]
        })
    return resultados
