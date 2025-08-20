from queue import Queue, Empty
from typing import Callable, Dict, Any
from functools import partial
from models import logger
import json
from itertools import cycle

preprocess_queue = Queue()
language_queue = Queue()
split_queue = Queue()
transcription_queue = Queue()
default_queue = Queue()  # just in case


def enqueue(q: Queue, func: Callable[..., object], *args, **kwargs):
    q.put((func, args, kwargs))
    logger.info("Enqueued task %s", func.__name__)


def dequeue(q: Queue):
    func, args, kwargs = q.get(block=False)
    logger.info("Dequeued task %s", func.__name__)
    q.task_done()
    return partial(func, *args, **kwargs)


def process_queues(connections: Dict[str, Any]):
    logger.info("Spinning up working thread")
    for q in cycle(
        [
            preprocess_queue,
            language_queue,
            split_queue,
            transcription_queue,
            default_queue,
        ]
    ):
        try:
            task = dequeue(q)
            logger.info("Executing task %s", task)
            result = task()
            logger.info("Result: %s", json.dumps(result, indent=2))
            try:
                user = result["user"]
                task_type = result["task_type"]
                conn = connections[user]
                if not conn:
                    raise ConnectionError(
                        f"Error notifying user {user} about task {task_type}, connection not stablished",
                    )
                conn.send(result)
            except Exception as e:
                logger.exception(e)
        except Empty:
            pass
        except Exception as e:
            logger.error("Error on task %s: %s", task, str(e))
            logger.exception(e)
