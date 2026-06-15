from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import pipeline as pl
import database as db
import shutil
import os
import uuid
import queue
import asyncio
import json

app = FastAPI(title="ChemPipe API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    db.init_db()

@app.post("/api/analyze")
async def analyze_files(
    f_id: UploadFile = File(...),
    f_abund: UploadFile = File(...),
    top_n: int = Form(100)
):
    session_id = str(uuid.uuid4())
    id_path = f"temp_id_{session_id}.xlsx"
    abund_path = f"temp_abund_{session_id}.xlsx"
    
    try:
        with open(id_path, "wb") as buffer:
            shutil.copyfileobj(f_id.file, buffer)
            
        with open(abund_path, "wb") as buffer:
            shutil.copyfileobj(f_abund.file, buffer)
    except Exception as e:
        if os.path.exists(id_path): os.remove(id_path)
        if os.path.exists(abund_path): os.remove(abund_path)
        raise HTTPException(status_code=500, detail=f"Erro ao inicializar arquivos temporários: {str(e)}")
        
    q = queue.Queue()
    
    def progress_callback(completed, total, current_compound):
        q.put({
            "type": "progress",
            "completed": completed,
            "total": total,
            "current": current_compound
        })
        
    def run_pipeline():
        try:
            df_resultados = pl.processar_planilhas(
                id_path, abund_path, top_n=top_n, progress_callback=progress_callback
            )
            
            if df_resultados is None or df_resultados.empty:
                q.put({
                    "type": "error",
                    "message": "Não foi possível cruzar os dados ou as planilhas estão vazias."
                })
                return
                
            # Salvar análise
            analise_id = db.salvar_analise(f_id.filename, f_abund.filename, df_resultados)
            
            q.put({
                "type": "complete",
                "analise_id": analise_id,
                "data": df_resultados.fillna("").to_dict(orient="records")
            })
        except Exception as e:
            q.put({"type": "error", "message": str(e)})
        finally:
            if os.path.exists(id_path): os.remove(id_path)
            if os.path.exists(abund_path): os.remove(abund_path)

    # Executar em uma thread separada para não bloquear o event loop do FastAPI
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, run_pipeline)
    
    async def event_generator():
        while True:
            try:
                # Esperar de forma não bloqueante por um item na fila
                event = await loop.run_in_executor(None, q.get)
                yield f"data: {json.dumps(event)}\n\n"
                if event["type"] in ("complete", "error"):
                    break
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                break
                
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/history")
def get_history():
    try:
        df_history = db.listar_analises()
        return df_history.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history/{analise_id}")
def get_history_details(analise_id: int):
    try:
        df_dados = db.carregar_dados_analise(analise_id)
        if df_dados.empty:
            raise HTTPException(status_code=404, detail="Análise não encontrada.")
        return df_dados.fillna("").to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    try:
        stats = db.obter_estatisticas_dashboard()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/search")
def search_compounds(q: str = ""):
    try:
        if not q or len(q.strip()) < 2:
            return []
        resultados = db.pesquisar_compostos_global(q.strip())
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/search-external")
def search_external_compounds(q: str = ""):
    try:
        if not q or len(q.strip()) < 2:
            return []
        resultados = pl.buscar_compostos_externos(q.strip())
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
