from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pipeline as pl
import database as db
import shutil
import os
import uuid

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
    try:
        # Create temp files
        session_id = str(uuid.uuid4())
        id_path = f"temp_id_{session_id}.xlsx"
        abund_path = f"temp_abund_{session_id}.xlsx"
        
        with open(id_path, "wb") as buffer:
            shutil.copyfileobj(f_id.file, buffer)
            
        with open(abund_path, "wb") as buffer:
            shutil.copyfileobj(f_abund.file, buffer)
            
        # Process data
        df_resultados = pl.processar_planilhas(id_path, abund_path, top_n=top_n)
        
        if df_resultados is None or df_resultados.empty:
            raise HTTPException(status_code=400, detail="Não foi possível cruzar os dados ou as planilhas estão vazias.")
            
        # Save to DB
        analise_id = db.salvar_analise(f_id.filename, f_abund.filename, df_resultados)
        
        # Clean up
        os.remove(id_path)
        os.remove(abund_path)
        
        return {
            "status": "success",
            "analise_id": analise_id,
            "message": "Análise concluída com sucesso!",
            "data": df_resultados.fillna("").to_dict(orient="records")
        }
        
    except Exception as e:
        if os.path.exists(id_path): os.remove(id_path)
        if os.path.exists(abund_path): os.remove(abund_path)
        raise HTTPException(status_code=500, detail=str(e))

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
