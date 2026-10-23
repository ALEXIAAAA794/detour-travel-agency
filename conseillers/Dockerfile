FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
COPY conseillers/requirements.txt /app/conseillers/requirements.txt
RUN pip install --no-cache-dir -r /app/conseillers/requirements.txt
COPY conseillers/app.py conseillers/auth.py /app/conseillers/
COPY conseillers/static/ /app/conseillers/static/
COPY support-ia/notifications.py /app/support-ia/notifications.py
RUN mkdir -p /app/conseillers/data /app/support-ia/data
EXPOSE 8081
CMD ["python", "/app/conseillers/app.py"]
