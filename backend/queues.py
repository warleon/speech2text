from queue import Queue
from typing import Callable
from functools import partial
from models import logger

single_queue = Queue()


def enqueue(func: Callable[..., object], *args, **kwargs):
    single_queue.put((func, args, kwargs))
    logger.info("Enqueued task %s", func.__name__)


def dequeue():
    func, args, kwargs = single_queue.get()
    logger.info("Dequeued task %s", func.__name__)
    return partial(func, *args, **kwargs), single_queue.task_done
