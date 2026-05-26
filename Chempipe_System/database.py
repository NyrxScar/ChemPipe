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
