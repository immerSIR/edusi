FROM python:3.12-slim

WORKDIR /app

# System dependencies: ffmpeg for audio conversion.
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps (torch CPU-only to keep image small)
COPY requirements.txt .
RUN pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway sets $PORT dynamically
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
