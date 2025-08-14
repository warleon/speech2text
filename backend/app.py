import os
import tempfile
from flask import Flask, request, jsonify
from  whisperx import load_audio, assign_word_speakers
from models import whisper_model, diarize_model



app = Flask(__name__)

@app.route("/", methods=["GET"])
def hello():
    return "hello world!"

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "audio_file" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio_file"]
    #language = request.form.get("language", None)

    audio_path=None
    audio = None
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        audio_path = tmp.name
        audio_file.save(audio_path)
        audio = load_audio(audio_path)

    try:
        # Perform transcription
        transcription = whisper_model.transcribe(audio, batch_size=32)
        diarize_segments = diarize_model(audio)
        result = assign_word_speakers(diarize_segments, transcription)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error":e}), 500
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
