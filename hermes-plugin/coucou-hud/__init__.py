"""Coucou Dynamic Island HUD integration for Hermes Agent."""

import json
import threading
import urllib.request
from typing import Any

RELAY_URL = "http://127.0.0.1:4040/api/hook"


def _send_event_async(payload: dict[str, Any]) -> None:
    """Send hook payload asynchronously to Coucou relay on 127.0.0.1:4040."""
    def _worker():
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                RELAY_URL,
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=0.8):
                pass
        except Exception:
            # Fail silently if Coucou desktop is not running
            pass

    t = threading.Thread(target=_worker, daemon=True)
    t.start()


def on_pre_llm_call(**kwargs: Any) -> None:
    user_msg = kwargs.get("user_message") or ""
    _send_event_async({
        "hook_event_name": "UserPromptSubmit",
        "coucou_agent": "hermes",
        "prompt": str(user_msg)[:80],
        "session_id": str(kwargs.get("session_id") or ""),
    })


def on_pre_tool_call(**kwargs: Any) -> None:
    tool_name = kwargs.get("tool_name") or "Tool"
    args = kwargs.get("args") or {}
    _send_event_async({
        "hook_event_name": "PreToolUse",
        "coucou_agent": "hermes",
        "tool_name": str(tool_name),
        "tool_input": args if isinstance(args, dict) else {},
    })


def on_post_tool_call(**kwargs: Any) -> None:
    tool_name = kwargs.get("tool_name") or "Tool"
    _send_event_async({
        "hook_event_name": "PostToolUse",
        "coucou_agent": "hermes",
        "tool_name": str(tool_name),
    })


def on_post_llm_call(**kwargs: Any) -> None:
    _send_event_async({
        "hook_event_name": "Stop",
        "coucou_agent": "hermes",
        "message": "Beres bro! Cek Telegram ya",
    })


def register(ctx: Any) -> None:
    """Register Coucou observer hooks."""
    ctx.register_hook("pre_llm_call", on_pre_llm_call)
    ctx.register_hook("pre_tool_call", on_pre_tool_call)
    ctx.register_hook("post_tool_call", on_post_tool_call)
    ctx.register_hook("post_llm_call", on_post_llm_call)
