from typing import List, Callable, Tuple, Dict, Any, Union
from functools import partial
from queue import Queue
from collections import defaultdict
import logging

logging.basicConfig(level=logging.NOTSET)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


# Represents a function call or flow step
class Task:
    def __init__(
        self,
        flow_id: str,  # the overall flow which this task is beign executed in
        on_call: Union[partial, Callable[..., object]],
        queue: Queue,
        dependencies: List["Task"] = [],
    ):
        self.id = (flow_id, Task.get_on_call_name(on_call))
        if isinstance(on_call, partial):
            self.on_call = on_call
        else:
            self.on_call = partial(on_call)
        self.queue = queue

        # state
        self.started: bool = False
        self.done: bool = False
        self.result: Dict[Any, Any] = None

        # dependency management
        self.dependants: Dict[Tuple[str, str], "Task"] = {}
        self.dependencies: Dict[Tuple[str, str], "Task"] = {}
        for dep in dependencies:
            self._add_dependency(dep)

    @property
    def ready(self):
        for dep in self.dependencies.values():
            if not dep.done:
                return False
        return True

    def _add_dependency(self, other: "Task"):
        self.dependencies[other.id] = other
        other._add_dependant(self)
        pass

    def _add_dependant(self, other: "Task"):
        self.dependants[other.id] = other
        pass

    def __call__(
        self,
    ):
        self.started = True
        logger.info(
            f"Started task {self.id} execution with arguments {self.on_call.args} {self.on_call.keywords}"
        )
        self.result = self.on_call()
        self.done = True
        self.queue.task_done()
        logger.info(f"Finished task {self.id} execution, returned: {self.result}")

        for dep in self.dependants.values():
            dep.enqueue()

        return self.result

    def _update_on_call(self, kwargs: Dict[Any, Union[Any, List[Any]]]):
        self.on_call = partial(self.on_call, **kwargs)

    def enqueue(self):
        if not self.ready:
            logger.debug(
                f"Failed to enqueue task {self.id}, not all dependencies are done"
            )
            return False

        kwargs = defaultdict(list)
        for dep in self.dependencies.values():
            for k, v in dep.result.items():
                kwargs[k].append(v)

        kwargs = {k: v[0] if len(v) == 1 else v for k, v in kwargs.items()}
        self._update_on_call(kwargs)
        self.queue.put(self)
        logger.debug(
            f"Succesfully enqueued task {self.id} to run with arguments {self.on_call.args} {self.on_call.keywords}"
        )
        return True

    @staticmethod
    def get_on_call_name(f: Union[partial, Callable[..., object]]) -> str:
        if isinstance(f, partial):
            return f.func.__name__
        return getattr(f, "__name__", repr(f))
