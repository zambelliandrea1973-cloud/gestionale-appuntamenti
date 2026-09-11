---
name: AI appointment assistant safety
description: Product and safety rules for conversational appointment creation.
---

The voice assistant may collect and interpret appointment details, but it must never write data without an explicit professional confirmation. Missing clients and services require separate approval before creation.

**Why:** AI interpretation can be incomplete or ambiguous, and the existing manual appointment flow must remain reliable and unaffected.

**How to apply:** Keep AI interpretation isolated from persistence. Treat voice as an input layer over the unchanged manual flow: use the same authenticated client list (or create a missing client after approval), the same services from general settings, the same calendar-slot availability rules, and the same client, service, and appointment endpoints. Preserve client name, date, time, and treatment as mandatory appointment fields.

The assistant conversation must follow the professional's selected application language. Localize its messages, date formatting, speech synthesis, speech recognition, and the language sent to the interpretation model together.

**Why:** A translated interface paired with Italian-only voice prompts is confusing and can cause the browser to transcribe spoken words incorrectly.

**How to apply:** Read the active i18n language at runtime, map it to a browser speech locale, and keep all assistant strings in the locale resources.

Treat confirmations conversationally rather than requiring an exact yes/no. After each assistant question, start listening automatically only after speech synthesis has finished.

**Why:** Professionals may answer with complete phrases, and starting recognition while the assistant is speaking can transcribe the assistant's own voice.

**How to apply:** Combine model intent classification with language-aware local confirmation detection. Queue automatic recognition from the speech completion event, and cancel pending voice activity when the dialog closes.

When a client lookup is inconclusive, a later name correction or search request must retry the catalog before asking permission to create a new client.

**Why:** A conversational correction is not a yes/no answer. Treating it as unknown can repeatedly offer duplicate client creation even when the client already exists.

**How to apply:** Normalize accents and punctuation, accept reversed first/last-name order, accept a partial name only when it identifies one unique client, and rerun the lookup while the create-client question is pending.

Approximate service matching may propose the strongest catalog candidate, but it must never select that service without explicit confirmation.

**Why:** Voice transcription and pronunciation can distort treatment names, while an incorrect automatic match would attach the appointment to the wrong service.

**How to apply:** Prefer exact normalized matches; allow typo/phonetic suggestions only above a confidence threshold or when clearly stronger than alternatives. A rejection must restart service selection.

When no exact or similar service is found, show the configured treatment list as visual support, but keep selection voice-only. The professional says a listed treatment name or explicitly asks to create the originally requested service.

**Why:** The assistant is intended for hands-free use; making the popup clickable would turn the fallback into a manual interaction.

**How to apply:** Open a readable, scrollable list, resume recognition immediately after the spoken prompt, show a green listening indicator in the popup, and close it after a recognized selection or creation command.

Whenever the assistant reaches the service question, show the configured service catalog immediately, even if the professional has not asked for suggestions.

**Why:** The visible catalog helps professionals recall the registered options without interrupting the conversational flow.

**How to apply:** On desktop, use a compact side panel so the conversation remains readable; on narrow screens, use a contained overlay. Keep voice input active and retain actions for selecting a listed service, adding a new one, or cancelling.

Generic service-family names must disambiguate only among exact-prefix variants. If the professional says a new qualified name that is absent, ask whether to create it instead of suggesting a sibling variant.

**Why:** A shared generic word such as “depilazione” does not make “depilazione gambe” equivalent to “depilazione inguine”.

**How to apply:** Show only services beginning with the complete generic request when at least two exist. Accept a listed name or “altro” by voice; suppress fuzzy matches that share only the family token.

Client names with a strong, unique similarity must be proposed for spoken confirmation, never silently selected. A corrected name spoken by the professional must trigger a fresh exact catalog lookup.

**Why:** Speech recognition can change one letter in a name, such as Bruno instead of Bruna, while creating the wrong client would fragment records.

**How to apply:** Compare complete multi-part names and their tokens, require a high score with a clear lead over other clients, and fall back to normal new-client confirmation when weak or ambiguous.

New services created by voice require both duration and price before final confirmation. After confirmation, the assistant creates any missing client/service records, then opens the normal manual appointment form with real database IDs.

**Why:** The manual form is the trusted path for occupied-slot, staff, room, notification-channel, conflict, and final-save behavior. Real IDs ensure new catalog records are immediately selectable there.

**How to apply:** Collect the explicit euro price, include it in the spoken summary, create confirmed missing references first, refresh catalogs, and hand the completed draft to the manual form. The assistant must not POST the appointment itself.

The voice-assistant window must remain movable so professionals can consult the calendar underneath, and normal assistant speech should hand off to listening only after synthesis ends.

**Why:** The calendar is needed as visual context during appointment entry, and simultaneous speech/listening can transcribe the assistant itself.

**How to apply:** Use a touch-capable drag handle with viewport bounds and a light overlay. Start recognition from speech completion, show an unmistakable green listening state, and never auto-retry unsupported or failed microphone access.

When central speech falls back to browser synthesis, wait for the browser voice catalog before selecting a voice.

**Why:** Windows and Chromium can initially return an empty voice list; speaking immediately then uses the system-default Italian voice, which may be male.

**How to apply:** Listen for `voiceschanged` with a short timeout, then prefer known female voices for the active locale. Log both the fallback reason and selected device voice without exposing request text or credentials.

An overlapping time slot is not automatically forbidden. Studios can schedule concurrent appointments when another active professional or treatment room is available.

**Why:** Treating every overlap as a duplicate would block valid work in multi-professional and multi-room businesses.

**How to apply:** Before the spoken final summary, compare the requested interval with active appointments, ignore cancelled entries, inspect active staff and rooms, offer free resources by name, and preserve the chosen resource in the manual appointment form. Keep an explicit option to proceed without assignment or choose another time.