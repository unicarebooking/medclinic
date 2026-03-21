FROM ollama/ollama:latest

# Pull the model during build so it's baked into the image
RUN nohup ollama serve > /dev/null 2>&1 & \
    sleep 5 && \
    ollama pull qwen2.5:1.5b && \
    ollama pull qwen3-embedding:0.6b && \
    pkill ollama || true

EXPOSE 11434

CMD ["serve"]
