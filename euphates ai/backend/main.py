import sqlite3
import logging
import os
import google.generativeai as genai
import openai
from dotenv import load_dotenv
import traceback
from contextlib import contextmanager
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, field_validator
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(os.path.join(os.getcwd(), '.env'))

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("EuphratesAPI")

app = FastAPI(title="Euphrates API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "euphrates.db"

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    try:
        with get_db() as conn:
            c = conn.cursor()
            c.execute('''CREATE TABLE IF NOT EXISTS analyses
                         (id INTEGER PRIMARY KEY AUTOINCREMENT,
                          name TEXT,
                          lat REAL,
                          lng REAL,
                          vegetation TEXT,
                          vegetation_value REAL,
                          land_type TEXT,
                          open_space TEXT,
                          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
            conn.commit()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

init_db()

class AnalysisResult(BaseModel):
    name: str
    lat: float
    lng: float
    vegetation: str
    vegetationValue: float
    landType: str
    openSpace: str

    @field_validator('lat')
    @classmethod
    def validate_lat(cls, v):
        if not (-90 <= v <= 90):
            raise ValueError('Latitude must be between -90 and 90')
        return v

    @field_validator('lng')
    @classmethod
    def validate_lng(cls, v):
        if not (-180 <= v <= 180):
            raise ValueError('Longitude must be between -180 and 180')
        return v

class AnalysisHistory(AnalysisResult):
    id: int
    timestamp: str

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error. Please check backend logs."},
    )

@app.post("/api/analyze")
async def save_analysis(data: AnalysisResult):
    logger.info(f"Saving analysis for: {data.name}")
    try:
        with get_db() as conn:
            c = conn.cursor()
            c.execute('''INSERT INTO analyses (name, lat, lng, vegetation, vegetation_value, land_type, open_space)
                         VALUES (?, ?, ?, ?, ?, ?, ?)''', 
                      (data.name, data.lat, data.lng, data.vegetation, data.vegetationValue, data.landType, data.openSpace))
            conn.commit()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Save failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to save analysis")

@app.get("/api/history", response_model=List[AnalysisHistory])
async def get_history():
    try:
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT * FROM analyses ORDER BY id DESC LIMIT 20")
            rows = c.fetchall()
            return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"Fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")

@app.delete("/api/history")
async def clear_history():
    try:
        with get_db() as conn:
            c = conn.cursor()
            c.execute("DELETE FROM analyses")
            conn.commit()
        return {"message": "Memory cleared"}
    except Exception as e:
        logger.error(f"Clear failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear memory")

# Configure AI Engines
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
model = None
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-flash-latest')
        logger.info("Gemini Flash initialized.")
    except Exception as e:
        logger.error(f"Gemini Init failed: {e}")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
openai_client = None
if OPENAI_API_KEY:
    try:
        openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
        logger.info("OpenAI initialized.")
    except Exception as e:
        logger.error(f"OpenAI Init failed: {e}")

import time

def get_ai_response(prompt, history=None):
    """Bulletproof AI call with retries and multiple fallbacks."""
    models_to_try = ['gemini-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro']
    
    # 1. Try Gemini Models with Retries
    if model:
        for model_name in models_to_try:
            for attempt in range(3):
                try:
                    logger.info(f"Attempting {model_name} (Attempt {attempt + 1})...")
                    current_model = genai.GenerativeModel(model_name)
                    if history:
                        # For chat, we use a simple concatenation for robustness
                        context = "\n".join([f"{m['role']}: {m['content']}" for m in history])
                        full_prompt = f"{prompt}\n\nContext:\n{context}\n\nUser: {prompt}"
                        response = current_model.generate_content(full_prompt)
                    else:
                        response = current_model.generate_content(prompt)
                    
                    if response and response.text:
                        return response.text.strip()
                except Exception as e:
                    logger.warning(f"{model_name} failed on attempt {attempt + 1}: {e}")
                    time.sleep(1) # Small delay before retry
    
    # 2. Try OpenAI Fallback
    if openai_client:
        try:
            logger.info("Attempting OpenAI Fallback...")
            messages = [{"role": "system", "content": "Professional Environmental Consultant Persona Active."}]
            if history:
                messages.extend(history)
            messages.append({"role": "user", "content": prompt})
            
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                timeout=30
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI fallback failed: {e}")

    return None

@app.post("/api/report")
def generate_report(data: AnalysisResult):
    logger.info(f"Generating expert report for: {data.name}")
    
    prompt = f"""
    SYSTEM ROLE: You are a friendly but professional Environmental Consultant.
    GOAL: Provide a clear, engaging ecological report for the {data.name} area in Kolkata.
    
    SITE DETAILS:
    - Area Type: {data.landType}
    - Greenery Level: {data.vegetationValue}% ({data.vegetation})
    - Open Space: {data.openSpace}
    
    STRICT GUIDELINES:
    1. DO NOT mention you are an AI.
    2. USE clear, accessible language.
    3. DO NOT include audit signatures or formal report numbers.
    4. Focus on resident-centric topics: cooling, air, and biodiversity.
    5. CRITICAL: Include a specific section for "Fast-Growing Recommendations" (like Subabul, Cassia, or Eucalyptus) alongside standard native species (like Bakul or Neem).
    
    Format using Markdown. Use bolding and bullet points.
    """

    report = get_ai_response(prompt)
    if report:
        return {"report": report}
    
    return {"report": "# ERROR: SYNTHESIS TEMPORARILY UNAVAILABLE\nOur AI experts are currently busy. Please try again in a few seconds."}

class ChatRequest(BaseModel):
    report: str
    message: str
    history: List[dict] = []

@app.post("/api/chat")
async def chat_with_report(data: ChatRequest):
    logger.info("Handling follow-up chat request")
    
    system_prompt = f"You are an Environmental Consultant. Here is the report you just wrote:\n\n{data.report}\n\nPlease answer the user's question based on this context."
    
    response = get_ai_response(data.message, history=data.history)
    if response:
        return {"response": response}

    return {"response": "I'm sorry, I'm having a bit of trouble thinking right now. Could you ask that again?"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
