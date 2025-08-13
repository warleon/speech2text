from flask import Flask, request, jsonify
import whisper_s2t
import os
import tempfile
from datetime import datetime

app = Flask(__name__)

# Load the model once at startup
model = whisper_s2t.load_model(
    model_identifier="large-v2",
    backend="CTranslate2",
    device="cpu",
    compute_type="int8"
)

@app.route("/", methods=["GET"])
def hello():
    return "hello world!"

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "audio_file" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio_file"]
    language = request.form.get("language", None)

    # Save the uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        audio_path = tmp.name
        audio_file.save(audio_path)

    try:
        # Perform transcription
        start_time = datetime.now().isoformat()
        segments = model.transcribe_with_vad([audio_path], lang_codes=[language], tasks=["transcribe"],initial_prompts=[None],batch_size=32)
        end_time = datetime.now().isoformat()

        # Format into table-like data
        results = [
            {
                "start": seg["start_time"],
                "end": seg["end_time"],
                "text": seg["text"]
            }
            for seg in segments[0]
        ]

        return jsonify({
            "start_time": start_time,
            "end_time": end_time,
            "segments": results
        })

    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
