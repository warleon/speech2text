from flask import Flask, render_template, request, jsonify
import whisper_s2t
import os
import tempfile

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "audio_file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    audio_file = request.files["audio_file"]

    # Defaults
    model_identifier = "large-v2"
    backend = "CTranslate2"
    lang_codes = request.form.getlist("lang_codes[]") or ["en"]

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        # Load the model (CPU + int8 for speed)
        model = whisper_s2t.load_model(
            model_identifier=model_identifier,
            backend=backend,
            device="cpu",        # CPU only
            compute_type="int8"  # lower precision for faster inference
        )

        # Transcribe
        out = model.transcribe_with_vad(
            [tmp_path],
            lang_codes=lang_codes,
            tasks=["transcribe"],
            initial_prompts=[None],
            batch_size=32
        )

        # Format output
        result = [
            {
                "start_time": segment["start_time"],
                "end_time": segment["end_time"],
                "text": segment["text"]
            }
            for segment in out[0]
        ]

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
