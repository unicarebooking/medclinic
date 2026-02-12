"""
Transcription engine using faster-whisper
Based on the existing transcribe.py project
"""

from faster_whisper import WhisperModel
from pathlib import Path


class Transcriber:
    def __init__(
        self,
        model_name: str = "Systran/faster-whisper-large-v3",
        device: str = "auto",
        compute_type: str = "auto",
    ):
        self.model_name = model_name
        self.device = device
        self.compute_type = compute_type
        self.model = None

    def load_model(self):
        if self.model is None:
            print(f"Loading model: {self.model_name}...")
            self.model = WhisperModel(
                self.model_name,
                device=self.device,
                compute_type=self.compute_type,
            )
            print("Model loaded successfully")

    def transcribe(
        self,
        audio_path: str,
        language: str = "he",
        on_progress=None,
    ) -> dict:
        self.load_model()

        path = Path(audio_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {audio_path}")

        print(f"Transcribing: {audio_path}")

        segments_iter, info = self.model.transcribe(
            audio_path,
            language=language,
            beam_size=5,
        )

        detected_language = info.language
        language_probability = info.language_probability
        duration = info.duration

        segments = []
        transcript_parts = []

        for segment in segments_iter:
            text = segment.text.strip()
            segments.append({
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": text,
            })
            transcript_parts.append(text)

            if on_progress and duration > 0:
                progress = min(segment.end / duration * 100, 100)
                on_progress(progress)

        full_text = " ".join(transcript_parts)

        return {
            "text": full_text,
            "segments": segments,
            "language": detected_language,
            "language_probability": round(language_probability, 2),
            "duration_seconds": round(duration, 1),
        }
