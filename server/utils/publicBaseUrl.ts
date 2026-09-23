export function getPublicBaseUrl(): string {
  const configured =
    process.env.PRODUCTION_DOMAIN ||
    process.env.APP_BASE_URL ||
    process.env.APP_URL;

  if (configured) {
    const withProtocol = /^https?:\/\//i.test(configured)
      ? configured
      : `https://${configured}`;
    return withProtocol.replace(/\/+$/, '');
  }

  return 'https://gestionale-appuntamenti.sliplane.app';
}