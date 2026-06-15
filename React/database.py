import sqlite3
import json
from datetime import datetime
import pandas as pd

DB_NAME = 'dados_analise_v2.db'

def get_connection():
    return sqlite3.connect(DB_NAME)

def init_db():
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
    
    conn.commit()
    conn.close()

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
        cursor.execute('''
        INSERT INTO resultados_compostos (
            analise_id, cid, composto, descricao, formula, massa, m_z, retention_time,
            score_base, score_biologico, score_total, iupac, ionizacao, categoria_quimica, metabolismo,
            vias, json_completo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            analise_id,
            str(row.get('Raw_API_Data', {}).get('ID', '') if isinstance(row.get('Raw_API_Data'), dict) else ''),
            str(row.get('Composto', '')),
            str(row.get('Description', '')),
            str(row.get('Fórmula', '')),
            tratar_float(row.get('Massa', 0)),
            tratar_float(row.get('m/z', 0)),
            tratar_float(row.get('Retention time (min)', 0)),
            tratar_float(row.get('Score Base', 0)),
            tratar_float(row.get('Bonus Biologico', 0)),
            tratar_float(row.get('Score Compatibilidade', 0)),
            str(row.get('IUPAC', '')),
            str(row.get('Ionização', '')),
            str(row.get('Categoria química', '')),
            str(row.get('Metabolismo', '')),
            str(row.get('Vias metabólicas', '')),
            json.dumps(row.get('Raw_API_Data', {}))
        ))
        
    conn.commit()
    conn.close()
    return analise_id

def carregar_dados_analise(analise_id):
    conn = get_connection()
    df = pd.read_sql_query("SELECT * FROM resultados_compostos WHERE analise_id = ?", conn, params=(analise_id,))
    conn.close()
    return df

def listar_analises():
    conn = get_connection()
    df = pd.read_sql_query("SELECT * FROM analises ORDER BY id DESC", conn)
    conn.close()
    return df
