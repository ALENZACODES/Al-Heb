# Camera translator service. Build from this folder:  docker build -t camera-translate tools/camera-translate
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-heb libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY camera_translate ./camera_translate
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN useradd --no-create-home runner
USER runner
EXPOSE 8790
# --no-access-log: request lines are not kept either. The filesystem can be mounted read-only; the service writes nothing.
CMD ["sh", "-c", "uvicorn camera_translate.app:app --host 0.0.0.0 --port ${PORT:-8790} --no-access-log"]
