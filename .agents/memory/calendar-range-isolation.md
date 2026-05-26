---
name: Calendar range endpoint isolation
description: Why getAppointmentsByDateRange must filter by user role
---

The `getAppointmentsByDateRange` method in `server/storage.ts` previously returned ALL appointments from every user in the database with no tenant isolation.

**The rule:** Always INNER JOIN with `users` table and filter `WHERE users.role IN ('admin', 'staff')` to exclude customer/trial accounts.

**Why:** New user registrations auto-generate ~270 demo appointments (via `onboardingDemoService.ts`). Without this filter, the admin calendar shows hundreds of fake "duplicate" appointments from unrelated practice owners.

**How to apply:** Any new query that fetches appointments for calendar/range display must include this join. The fix is in `getAppointmentsByDateRange` (line ~1456 of storage.ts).
