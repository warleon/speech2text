from redis import Redis
from rq import Queue
import json

rq_connection = Redis(host='rq-server', port=6379, decode_responses=True)



single = "single"

single_queue = Queue(single,connection=rq_connection)

def pubsub_listener(connections:dict):
    ps = rq_connection.pubsub()
    ps.subscribe(single)
    for msg in ps.listen():
        if msg["type"] == "message":
            raw = msg["data"]
            data  = json.load(msg["data"])
            user = data["user"]
            conn = connections[user]
            try:
                conn.send(raw)
            except Exception:
                connections.pop(user)