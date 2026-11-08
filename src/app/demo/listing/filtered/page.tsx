// The dynamic half of /demo/listing: next.config.ts rewrites any request with a
// ?category= or ?cursor= param here, so the bare page can stay static. See ../page.tsx.
export { default, metadata } from "../ListingDemo";
