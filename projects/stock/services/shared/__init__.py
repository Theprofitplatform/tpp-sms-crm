"""
Shared modules for Stock Trading Automation System services.

This package contains code shared across multiple Python microservices.
"""

from .kill_switch import (
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
