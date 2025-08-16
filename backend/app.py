from flask import Flask, request, jsonify
from flask_sock import Sock
from queues import single_queue
from pubsub import pubsub_listener
from tasks import convert_to_numpy
from worker import start_workers
import threading

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
    job = single_queue.enqueue(convert_to_numpy, file_name, user)
    return jsonify({"job_id": job.id})


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
    threading.Thread(target=pubsub_listener, args=[connections], daemon=True).start()
    start_workers()
    app.run(debug=True, host="0.0.0.0", port=8000)
