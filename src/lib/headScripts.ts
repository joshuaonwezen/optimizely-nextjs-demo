export const GA_MEASUREMENT_ID = "G-2MTP98PSWL";
export const GTM_CONTAINER_ID = "GTM-5SVM6NH";

const odpTrackerId =
  process.env.NEXT_PUBLIC_OPTIMIZELY_ODP_TRACKER_ID ?? "dWs2ejwWekVGmZj9JoOIcA";

const theme = `(function(){var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');})();`;

// Inlined in <head> so the zaius queue exists synchronously during HTML
// parsing - before React hydration, before any useEffect fires.
const odp = [
  "var zaius=window['zaius']||(window['zaius']=[]);",
  "zaius.methods=['initialize','onload','customer','entity','event','subscribe','unsubscribe','consent','identify','anonymize','dispatch'];",
  "zaius.factory=function(e){return function(){var t=Array.prototype.slice.call(arguments);t.unshift(e);zaius.push(t);return zaius}};",
  "(function(){",
  "for(var i=0;i<zaius.methods.length;i++){var method=zaius.methods[i];zaius[method]=zaius.factory(method)}",
  `var e=document.createElement('script');e.type='text/javascript';e.async=true;e.src=('https:'===document.location.protocol?'https://':'http://')+'d1igp3oop3iho5.cloudfront.net/v2/${odpTrackerId}/zaius-min.js';`,
  "var t=document.getElementsByTagName('script')[0];t.parentNode.insertBefore(e,t);",
  "})();",
].join("");

const gtag = [
  "window.dataLayer = window.dataLayer || [];",
  "function gtag(){dataLayer.push(arguments);}",
  "gtag('js', new Date());",
  `gtag('config', '${GA_MEASUREMENT_ID}');`,
].join("");

const gtm =
  "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':" +
  "new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0]," +
  "j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=" +
  "'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);" +
  `})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`;

// The root layout's inline <head> scripts. They live outside layout.tsx because the
// strict CSP route (src/lib/security/csp.ts) allows them by SHA-256 hash, and a hash
// matches only the exact text rendered: both sides import these strings, so an edit
// here changes the page and the hash together.
export const HEAD_SCRIPTS = { gtag, gtm, theme, odp } as const;
