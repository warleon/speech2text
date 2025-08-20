from flask import Flask, request, jsonify
from flask_sock import Sock
from queues import enqueue, process_queues, preprocess_queue
from tasks import convert_to_numpy
import threading
from models import logger, AIModels
from typing import Dict, Any

# todo remove hypercorn from the requirements


app = Flask(__name__)
webSocket = Sock(app)
connections: Dict[str, Any] = {}


@app.route("/", methods=["GET"])
def hello():
    return "hello world!"


@app.route("/dispatch", methods=["GET"])
def dispatch():
    file_name = request.args["file"]
    user = request.args["user"]
    task_id = request.args["task"]
    logger.info("Enqueuing %s task", convert_to_numpy.__name__)
    enqueue(preprocess_queue, convert_to_numpy, file_name, user, task_id)
    return jsonify({"status": "enqueued"}), 200


@webSocket.route("/ws")
def websocket(conn):
    user = request.args["user"]
    connections[user] = conn

    try:
        while True:
            # Keep reading to prevent disconnect
            msg = conn.receive()
            if msg is None:
                break
    finally:
        connections.pop(user)


if __name__ == "__main__":
    models = AIModels()
    models.load_models()  # just to ensure
    worker_thread = threading.Thread(
        target=process_queues, args=[connections], daemon=True
    )
    worker_thread.start()
    app.run(debug=True, host="0.0.0.0", port=8000)
    worker_thread.join()
