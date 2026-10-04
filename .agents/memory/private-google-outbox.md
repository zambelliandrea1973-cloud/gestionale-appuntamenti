---
name: Private Google reconciliation
description: Remote success can survive a local rollback; safe deletion and destination binding.
---

Never interpret a missing acknowledged Google identifier as proof that an event was never exported. Keep deletion tombstones until provider deletion or confirmed absence succeeds, including deterministic-ID reconciliation.

This concerns the older protected archive, not the subsequently selected local appointment mode. Do not reconnect its UI or export local-mode records without a new explicit product decision.

**Why:** A provider can accept a write while its acknowledgment is lost or the local transaction rolls back. Later operations must not orphan that remote copy.

**How to apply:** Bind the destination durably before remote writes, acknowledge exports independently, and prevent switching calendars while unresolved copies remain. Erase deleted content while retaining reconciliation metadata.