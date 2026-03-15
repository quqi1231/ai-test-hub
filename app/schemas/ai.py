"""
AI Schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AIGenerateRequest(BaseModel):
    requirement: str
    interface_id: Optional[int] = None

class AIGenerateResponse(BaseModel):
    cases: str
    model: str

class AISummaryRequest(BaseModel):
    test_results: str

class AISummaryResponse(BaseModel):
    summary: str
    model: str
