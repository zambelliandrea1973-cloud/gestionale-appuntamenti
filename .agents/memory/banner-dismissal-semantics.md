---
name: Banner dismissal semantics
description: Expected persistence for permanent dismissal versus temporary reminders.
---

“Non mostrare più” must require explicit confirmation, survive logout and subsequent logins, remain scoped to the individual account, and not be erased by routine login cache cleanup. “Ricordamelo dopo” and the close button hide the message only for the current login session.

**Why:** Users interpret permanent dismissal literally; treating temporary and permanent actions as the same stored flag causes banners either to return unexpectedly or disappear forever.

**How to apply:** Ask for confirmation immediately before saving a permanent dismissal. Store permanent UI preferences under account-specific keys that login/logout cleanup preserves. Store snoozes in session storage so logout clears them and the message can return at the next login.