from redis import Redis
from rq import Queue

rq_connection = Redis(host="rq-server", port=6379)


single = "single"

single_queue = Queue(single, connection=rq_connection)
