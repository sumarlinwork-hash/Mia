from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional
from pydantic import BaseModel

class Event(BaseModel):
    type: str
    payload: Dict[str, Any]
    source: str
    timestamp: float

class EventBus(ABC):
    @abstractmethod
    async def publish(self, event: Event):
        pass

    @abstractmethod
    async def subscribe(self, event_type: str, handler: Callable):
        pass

class StateStore(ABC):
    @abstractmethod
    async def set_state(self, key: str, value: Any):
        pass

    @abstractmethod
    async def get_state(self, key: str) -> Any:
        pass

    @abstractmethod
    async def delete_state(self, key: str):
        pass

class ToolAdapter(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    async def execute(self, args: Dict[str, Any]) -> Any:
        pass
