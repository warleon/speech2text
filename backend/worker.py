from rq.worker_pool import WorkerPool
from rq.worker import SimpleWorker, Worker
from rq.serializers import JSONSerializer
from queues import rq_connection, single_queue
from rq import intermediate_queue
from redis import _parsers


workers = WorkerPool(
    queues=[single_queue],
    connection=rq_connection,
    num_workers=1,
    worker_class=Worker,
)


def start_workers():
    workers.start_workers(burst=False, logging_level="DEBUG")
