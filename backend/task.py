from typing import List, Callable, Tuple, Dict, Any
from functools import partial
from queue import Queue
from collections import defaultdict


# Represents a function call or flow step
class Task:
    def __init__(
        self,
        flow_id: str,  # the overall flow which this task is beign executed in
        task_name: str,  #
        queue: Queue,
        onCall: partial | Callable[..., object],
        dependencies: List["Task"],
    ):
        self.id = (flow_id, task_name)
        self.onCall = onCall
        self.queue = queue

        # state
        self.started: bool = False
        self.done: bool = False
        self.result: Dict[Any, Any] = None

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
        self.result = self.onCall()
        self.done = True

        for dep in self.dependants.values():
            dep.notify()

    def _update_onCall(self, kwargs: Dict[Any, Any | List[Any]]):
        self.onCall = partial(self.onCall, **kwargs)

    def notify(self):
        if not self.ready:
            return

        kwargs = defaultdict(list)
        for dep in self.dependencies.values():
            for k, v in dep.result.items():
                kwargs[k].append(v)

        kwargs = {k: v[0] if len(v) == 1 else v for k, v in kwargs.items()}
        self._update_onCall(kwargs)
        self.queue.put(self)
