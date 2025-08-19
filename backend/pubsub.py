from redis import Redis
import json

rq_connection = Redis(host="rq-server", port=6379)

PUBSUB_NOTIFICATION = "PUBSUB_NOTIFICATION"


def pubsub_listener(connections: dict):
    ps = rq_connection.pubsub()
    ps.subscribe(PUBSUB_NOTIFICATION)
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


def notify(content: dict):
    rq_connection.publish(PUBSUB_NOTIFICATION, json.dumps(content))
