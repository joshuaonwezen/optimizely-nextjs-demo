// Some content types are being trialled on the personal CMS instance only
// (see personalOnlyTypes.mjs). This decides whether the running app, or a script,
// points at that instance.
export const PERSONAL_CMS_HOST = "app-ocstjoshuac8je4ft002.cms.optimizely.com";

export function isPersonalInstance(
  url = process.env.OPTIMIZELY_CMS_URL ?? process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL
): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname === PERSONAL_CMS_HOST;
  } catch {
    return false;
  }
}
