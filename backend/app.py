from flask import Flask, request, jsonify
from flask_sock import Sock
from queues import enqueue
from pubsub import pubsub_listener
from tasks import convert_to_numpy
from worker import start_workers
import threading
from models import logger, AIWorker

# todo remove hypercorn from the requirements


app = Flask(__name__)
webSocket = Sock(app)
connections = dict()


@app.route("/", methods=["GET"])
def hello():
    return "hello world!"


@app.route("/dispatch", methods=["GET"])
def dispatch():
    file_name = request.args["file"]
    user = request.args["user"]
    task_id = request.args["task"]
    logger.info("Enqueuing %s task", convert_to_numpy.__name__)
    enqueue(convert_to_numpy, file_name, user, task_id)
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
    models = AIWorker()
    models.load_models()
    ps_thread = threading.Thread(
        target=pubsub_listener, args=[connections], daemon=True
    )
    worker_thread = threading.Thread(target=start_workers, args=[], daemon=True)
    worker_thread.start()
    ps_thread.start()
    app.run(debug=True, host="0.0.0.0", port=8000)
    ps_thread.join()
    worker_thread.join()
