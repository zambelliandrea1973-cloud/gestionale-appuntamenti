import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildItalianHelpCallOfferHtml,
  buildItalianHelpCallOfferText,
  getItalianHelpCallOffer,
} from '../server/services/italianHelpCallOffer';

test('Italian welcome email offer links to the correct WhatsApp conversation', () => {
  const offer = getItalianHelpCallOffer('it');
  assert.ok(offer);
  assert.match(offer.description, /videochiamata gratuita di 15 minuti/);
  assert.match(offer.description, /prima configurazione/);

  const url = new URL(offer.whatsappUrl);
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, '/393472550110');
  assert.match(url.searchParams.get('text') || '', /primo appuntamento/);
  assert.match(buildItalianHelpCallOfferHtml('it'), /Concorda l’appuntamento su WhatsApp/);
  assert.match(buildItalianHelpCallOfferText('it'), /347 255 0110/);
});

test('the free support call offer is omitted from non-Italian welcome emails', () => {
  for (const language of ['en', 'de', 'fr', 'es', 'ru', 'nl', 'no', 'ro'] as const) {
    assert.equal(getItalianHelpCallOffer(language), null);
    assert.equal(buildItalianHelpCallOfferHtml(language), '');
    assert.equal(buildItalianHelpCallOfferText(language), '');
  }
});
