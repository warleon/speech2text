from queue import Queue, Empty
from typing import Callable, Dict, Tuple, Any
from functools import partial
from models import logger
import json
from collections import defaultdict
from task import Task

QUEUES: Dict[str, Queue] = defaultdict(Queue)


def dequeue(q: Queue):
    task = q.get(block=False)
    if not isinstance(task, Task):
        raise ValueError(f"A non Task object was found on dequeue")
    return task


def process_queues(connections: Dict[str, Any]):
    logger.info("Spinning up working thread")
    while True:
        for u, q in list(QUEUES.items()):
            try:
                task = dequeue(q)
                result = task()
                jsonResult = json.dumps(result)
                try:
                    user = task.metadata["user"]
                    task_type = task.metadata["task_type"]
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
                QUEUES.pop(u, None)
            except Exception as e:
                logger.error(f"Error on task {task.id}: {str(e)}")
                logger.exception(e)
