import { getProduct, productCatalog } from "@/lib/catalog/products";

// The demo's fake product API. The Product picker CMS UI extension
// (../product-picker-cms-extension) reads the full list to fill its dropdown, and the
// contract it relies on is { updatedAt, products: [{ id, name, category, rate, ... }] }.
// Public and read-only: the catalog holds nothing a customer can't see on the site.

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";

export function GET(request: Request): Response {
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const product = getProduct(id);
    return product
      ? Response.json(product, { headers: { "Cache-Control": CACHE_CONTROL } })
      : Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json(productCatalog(), { headers: { "Cache-Control": CACHE_CONTROL } });
}
