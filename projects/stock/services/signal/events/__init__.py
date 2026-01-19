"""
Signal Service Events Module.

Provides event consumer with deduplication support for processing
events from the outbox dispatcher.
"""

from .consumer import EventConsumer, get_event_consumer

__all__ = ["EventConsumer", "get_event_consumer"]
