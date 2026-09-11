---
name: Google OAuth callbacks on iOS
description: Safe recovery when an Apple PWA and Safari do not share the initiating session cookie.
---

An OAuth callback from an Apple mobile browser may continue without the initiating session cookie only when the server-signed state is authentic, recent, structurally valid, and identifies the initiating user.

**Why:** iOS can start authorization in an installed PWA and return from Google in Safari, whose cookie context does not contain the PWA session. Requiring only the original session nonce rejects legitimate reconnects.

**How to apply:** Keep strict nonce-to-session matching whenever the pending session exists. Allow the sessionless recovery only for iPhone/iPad browser contexts, within the short state lifetime, and never log the authorization code, signed state, cookies, or full callback query.