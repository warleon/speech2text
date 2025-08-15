from flask import Flask, request, jsonify
from models import whisper_model, diarize_model
from queues import single_queue
from tasks import convert_to_numpy

app = Flask(__name__)

@app.route("/", methods=["GET"])
def hello():
    return "hello world!"

@app.route("/dispatch", methods=["GET"])
def dispatch():
    file_name = request.args["file"]
    user = request.args["user"]
    job = single_queue.enqueue(convert_to_numpy,file_name,user)
    return jsonify({
        "job_id":job.id
    })

    



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
