import catalog from "./productCatalog.json";

// The demo bank's product catalog: a stand-in for a core-banking product API. The CMS
// stores only a product ID (picked in the editor by the Product picker CMS UI
// extension, which reads /api/catalog/products); names and rates are always rendered
// from here, so a rate change never needs a content edit.

export type ProductCategory = "savings" | "current-account" | "credit-card" | "mortgage" | "business" | "investment";

export interface ProductRate {
  /** A percentage, e.g. 5.1 for 5.10%. */
  value: number;
  /** What the percentage is: "AER", "APR", "initial rate", "annual fee". */
  label: string;
  basis: "fixed" | "variable";
  note?: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  rate: ProductRate;
  summary: string;
  features: string[];
  /** Site path of the product page, without a locale prefix (it resolves on every instance). */
  url: string;
  /** A ProductCardBlock ICON_MAP key. */
  icon: string;
}

export interface ProductCatalog {
  updatedAt: string;
  products: Product[];
}

const CATALOG = catalog as ProductCatalog;

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  savings: "Savings",
  "current-account": "Current accounts",
  "credit-card": "Credit cards",
  mortgage: "Mortgages",
  business: "Business",
  investment: "Investments",
};

export function productCatalog(): ProductCatalog {
  return CATALOG;
}

export function getProduct(id: string | null | undefined): Product | null {
  const wanted = id?.trim();
  return wanted ? (CATALOG.products.find((p) => p.id === wanted) ?? null) : null;
}

/** "5.10%" - rates always show two decimals, the way banks quote them. */
export function formatRate(rate: ProductRate): string {
  return `${rate.value.toFixed(2)}%`;
}
