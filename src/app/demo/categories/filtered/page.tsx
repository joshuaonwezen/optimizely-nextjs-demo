// The dynamic half of /demo/categories: next.config.ts rewrites any request with
// a ?category= param here, so the bare page can stay static. See ../page.tsx.
export { default, metadata } from "../CategoriesDemo";
