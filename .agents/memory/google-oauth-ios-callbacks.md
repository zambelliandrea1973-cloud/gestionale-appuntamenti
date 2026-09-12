---
name: Google OAuth callbacks across browser contexts
description: Durable one-time authorization handoffs when the initiating app and callback browser do not share cookies.
---

Use a durable, short-lived, one-time server-side transaction for every Google authorization. Send only an opaque random state to Google, store only its digest, and atomically consume the transaction at callback.

**Why:** An installed PWA and Safari may not share cookies. Session recovery based on browser detection is unreliable and cannot consume a self-contained state globally across server instances.

**How to apply:** Bind each transaction to its owner, purpose, redirect and opener origin; enforce expiry and atomic single use. Never log authorization codes, raw state, cookies, headers, or full callback URLs.