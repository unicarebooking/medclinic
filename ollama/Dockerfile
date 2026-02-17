FROM ollama/ollama:latest

# Pull the model during build so it's baked into the image
RUN ollama serve & sleep 5 && ollama pull llama3.1:8b && killall ollama

EXPOSE 11434

CMD ["serve"]
