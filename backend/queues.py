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
        queues = list(QUEUES.items())
        ql = len(queues)
        logger.info(f"Iterating through {ql} queues")
        for u, q in queues:
            try:
                # TODO fix race condition
                task = dequeue(q)  # may fail if currently empty and added new tasks
                result = task()
                jsonResult = json.dumps(
                    {
                        **result,
                        "task_type": task.metadata["task_type"],
                        "task_id": task.metadata["flow_id"],
                    }
                )
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
                logger.info(f"Removing queue for user {u} due to lack of task")
                QUEUES.pop(u, None)
            except Exception as e:
                logger.error(f"Error on task {task.id}: {str(e)}")
                logger.exception(e)
