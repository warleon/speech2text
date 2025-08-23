from queue import Queue, Empty
from typing import Callable, Dict, Tuple, Any
from functools import partial
from models import logger
import json
from itertools import cycle
from task import Task

preprocess_queue = Queue()
language_queue = Queue()
split_queue = Queue()
transcription_queue = Queue()

_ALL_QUEUES = [
    preprocess_queue,
    language_queue,
    split_queue,
    transcription_queue,
]


def dequeue(q: Queue):
    task = q.get(block=False)
    if not isinstance(task, Task):
        raise ValueError(f"A non Task object was found on dequeue")
    return task


def process_queues(connections: Dict[str, Any]):
    logger.info("Spinning up working thread")
    for q in cycle(_ALL_QUEUES):
        try:
            task = dequeue(q)
            result = task()
            jsonResult = json.dumps(result)
            try:
                user = result["user"]
                task_type = result["task_type"]
                if not user in connections:
                    raise ConnectionError(
                        f"Error notifying user {user} about task {task_type}, connection not stablished",
                    )
                conn = connections[user]
                logger.info("Sending %s to the user %s", jsonResult, user)
                conn.send(jsonResult)
            except Exception as e:
                logger.exception(e)
        except Empty:
            pass
        except Exception as e:
            logger.error("Error on task %s: %s", task, str(e))
            logger.exception(e)
