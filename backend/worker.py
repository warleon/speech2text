from queues import dequeue
from models import logger


def start_workers():
    logger.info("Spinning up working thread")
    while True:
        try:
            logger.info("Waiting for task to be added to the queue")
            task, done = dequeue()
            logger.info("Executing task %s", task)
            task()
            logger.info("Executed task %s", task)
        except Exception as e:
            logger.error("Error on task %s: %s", task, str(e))
        finally:
            done()
