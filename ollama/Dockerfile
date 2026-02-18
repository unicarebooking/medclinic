FROM ollama/ollama:latest

# Pull the model during build so it's baked into the image
RUN nohup ollama serve > /dev/null 2>&1 & \
    sleep 5 && \
    ollama pull llama3.2:3b && \
    ollama pull nomic-embed-text && \
    pkill ollama || true

EXPOSE 11434

CMD ["serve"]
