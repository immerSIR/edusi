from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import auth, lessons, voice, content, whatsapp

app = FastAPI(
    title="Edusi API",
    description="Backend API for the Edusi bilingual learning platform",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api")
app.include_router(lessons.router, prefix="/api")
app.include_router(voice.router, prefix="/api")
app.include_router(content.router, prefix="/api")
app.include_router(whatsapp.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "edusi-api"}
