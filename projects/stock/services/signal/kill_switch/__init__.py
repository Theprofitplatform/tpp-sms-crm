"""
Kill Switch module for Signal Service.

Provides distributed kill switch functionality backed by Redis.
"""

from .distributed import (
    DistributedKillSwitch,
    KillSwitchStatus,
    KillSwitchActiveError,
    get_kill_switch,
    initialize_kill_switch,
)

__all__ = [
    "DistributedKillSwitch",
    "KillSwitchStatus",
    "KillSwitchActiveError",
    "get_kill_switch",
    "initialize_kill_switch",
]
