---
name: Onboarding demo data generation
description: What gets auto-created when a new user registers
---

`server/services/onboardingDemoService.ts` auto-generates on registration:
- 12 demo clients: Lucia Esposito, Elena Greco, Marco Conti, Paola Romano, Valentina De Luca, etc.
- 6 demo services: Taglio+Piega, Colorazione completa, Manicure, Pedicure, Trattamento viso, Meches
- ~260-270 demo appointments spread across ~78 days

**Why this matters:** All these records have `user_id = new_user_id` and `role: user`. They must NOT appear in the admin's calendar view. The role filter in `getAppointmentsByDateRange` handles this.
