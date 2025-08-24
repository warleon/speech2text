from flask import Flask, request, jsonify
from flask_sock import Sock
from queues import process_queues, QUEUES
from tasks import convert_to_numpy
import threading
from models import logger, AIModels
from typing import Dict, Any
from task import Task, partial
from simple_websocket.ws import Server as WSServer


app = Flask(__name__)
webSocket = Sock(app)
connections: Dict[str, WSServer] = {}


@app.route("/", methods=["GET"])
def hello():
    return "hello world!"


@app.route("/dispatch", methods=["GET"])
def dispatch():
    file_name = request.args["file"]
    user = request.args["user"]
    flow_id = request.args["task"]
    task = Task(
        flow_id,
        partial(convert_to_numpy, file_name),
        QUEUES[user],
        metadata={"user": user},
    )
    if task.enqueue():
        return jsonify({"status": "enqueued"}), 200
    else:
        return jsonify({"status": "failed to enqueue"}), 500


@webSocket.route("/ws")
def websocket(conn: WSServer):
    user = request.args["user"]
    connections[user] = conn

    try:
        while True:
            # Keep reading to prevent disconnect
            msg = conn.receive()
            if msg is None:
                break
    finally:
        conn = connections.pop(user)
        conn.close()


# TODO add information endpoints to fetch progress information


if __name__ == "__main__":
    models = AIModels()
    models.load_models()  # just to ensure
    worker_thread = threading.Thread(
        target=process_queues, args=[connections], daemon=True
    )
    worker_thread.start()
    app.run(debug=True, host="0.0.0.0", port=8000)
    worker_thread.join()
