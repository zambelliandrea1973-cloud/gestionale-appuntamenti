---
name: Onboarding demo data generation
description: What gets auto-created when a new user registers
---

`server/services/onboardingDemoService.ts` auto-generates on registration:
- 12 demo clients: Lucia Esposito, Elena Greco, Marco Conti, Paola Romano, Valentina De Luca, etc.
- 6 demo services: Taglio+Piega, Colorazione completa, Manicure, Pedicure, Trattamento viso, Meches
- ~260-270 demo appointments spread across ~78 days

**Why this matters:** All these records have `user_id = new_user_id` and `role: user`. They must NOT appear in the admin's calendar view. The role filter in `getAppointmentsByDateRange` handles this.

Demo data must be removed automatically after the first real client, service, manual/AI appointment, or Google import.

**Why:** Leaving sample rows after real activity makes the calendar and client list look like genuine imported data. Cleanup must never remove the real appointment that triggered the transition.

**How to apply:** Use one tenant-scoped, transactional cleanup. Preserve the triggering appointment and any selected dependencies, and delete only remaining demo-linked records. Google cleanup must consider events found previously, not only newly imported rows.

Demo-linked appointments must never be exported or updated in Google Calendar, including primary, staff-secondary, scheduled, and direct sync paths.

**Why:** Demo appointments were previously treated as ordinary local appointments and copied into users' personal Google calendars.

**How to apply:** Check both client and service demo flags before every outbound Google insert/update. Legacy Google analysis is read-only and requires an exact demo title plus a gestionale signature/contact; exclude imported mappings and linked real appointments. Do not add deletion without explicit product approval.
