import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRegistrationOfferWhatsAppUrl,
  isItalianRegistrationOfferLocale,
  REGISTRATION_OFFER_COPY,
} from "../client/src/lib/registrationOffer";

test("the registration offer is limited to Italian app locales", () => {
  assert.equal(isItalianRegistrationOfferLocale("it"), true);
  assert.equal(isItalianRegistrationOfferLocale("it-IT"), true);
  assert.equal(isItalianRegistrationOfferLocale("it_CH"), true);
  assert.equal(isItalianRegistrationOfferLocale("en"), false);
  assert.equal(isItalianRegistrationOfferLocale("de-DE"), false);
  assert.equal(isItalianRegistrationOfferLocale(undefined), false);
});

test("the WhatsApp link opens the supplied number with the booking message", () => {
  const url = new URL(buildRegistrationOfferWhatsAppUrl());

  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/393472550110");
  assert.equal(url.searchParams.get("text"), REGISTRATION_OFFER_COPY.whatsappMessage);
  assert.match(REGISTRATION_OFFER_COPY.whatsappMessage, /15 minuti/);
  assert.match(REGISTRATION_OFFER_COPY.whatsappMessage, /primo appuntamento/);
});
