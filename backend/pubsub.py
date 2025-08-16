from queues import rq_connection, single
import json


def pubsub_listener(connections: dict):
    ps = rq_connection.pubsub()
    ps.subscribe(single)
    for msg in ps.listen():
        if msg["type"] == "message":
            raw = msg["data"]
            data = json.load(msg["data"])
            user = data["user"]
            conn = connections[user]
            try:
                conn.send(raw)
            except Exception:
                connections.pop(user)
