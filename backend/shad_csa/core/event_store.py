import time

class EventStore:
    """
    SHAD-CSA Bounded Event Store (Source of Truth).
    Ensures memory stability by limiting event log size.
    """
    def __init__(self, max_size=10000):
        self.events = []
        self.max_size = max_size

    def append(self, event_type: str, value, metadata: dict = None):
        """Append a new event to the log with memory bounding."""
        if len(self.events) >= self.max_size:
            # FIFO: Remove oldest event to prevent unbounded growth
            self.events.pop(0)

        event = {
            "type": event_type,
            "value": value,
            "metadata": metadata or {},
            "timestamp": time.time()
        }
        self.events.append(event)

    def query(self, event_type: str = None, limit: int = 100):
        """Query events from the store, optionally filtering by type."""
        results = self.events
        if event_type:
            results = [e for e in self.events if e["type"] == event_type]
        
        return results[-limit:]

    def clear(self):
        """Wipe the event log."""
        self.events = []

# Singleton instance for global access within the package
event_store = EventStore()
