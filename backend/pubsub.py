from queues import rq_connection, single
import json


def pubsub_listener(connections: dict):
    ps = rq_connection.pubsub()
    ps.subscribe(single)
    for msg in ps.listen():
        if msg["type"] == "message":
            raw = msg["data"]
            data = json.loads(msg["data"])
            user = data["user"]
            try:
                conn = connections[user]
                conn.send(raw)
            except KeyError:
                print("Websocket connection for", user, "not found")
            except Exception:
                connections.pop(user)
