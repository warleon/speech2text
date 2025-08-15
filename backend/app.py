from flask import Flask, request, jsonify
from flask_sock import Sock
from .queues import single_queue
from .pubsub import pubsub_listener
from .tasks import convert_to_numpy
import threading
from hypercorn.config import Config
from hypercorn.asyncio import serve
import asyncio


app = Flask(__name__)
ws = Sock(app)
connections = dict()


@app.route("/", methods=["GET"])
def hello():
    return "hello world!"


@app.route("/dispatch", methods=["GET"])
def dispatch():
    file_name = request.args["file"]
    user = request.args["user"]
    job = single_queue.enqueue(convert_to_numpy, file_name, user)
    return jsonify({"job_id": job.id})


@ws.route("/ws")
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
    config = Config()
    config.bind = ["0.0.0.0:8000"]
    threading.Thread(target=pubsub_listener, args=[connections], daemon=True).start()
    asyncio.run(serve(app, config))
