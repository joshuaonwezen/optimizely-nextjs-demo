import { StickyOfferBarClient } from "./StickyOfferBarClient";

// The sticky_offer_bar experiment is decided client-side so this stays out of the
// cookie-reading server render path (keeps the route ISR-cacheable).
export default function StickyOfferBar() {
  return <StickyOfferBarClient />;
}
