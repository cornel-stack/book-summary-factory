import React, { createContext, useContext } from "react";
import { BRANDS, DEFAULT_BRAND, type Brand, type BrandId } from "../../config/brands";

/**
 * Active-brand context. The composition wraps its tree in <BrandProvider> with
 * the script's brand; every brand-sensitive scene/component reads the resolved
 * palette via useBrand(). Shared ink colors still come from theme.ts COLORS —
 * only the brand-identity surface (paper, accent, highlight, chrome, caption,
 * chip) lives here. Default is ReadLark so dev stills render without a provider.
 */
const BrandContext = createContext<Brand>(BRANDS[DEFAULT_BRAND]);

export const BrandProvider: React.FC<{
  brand?: BrandId;
  children: React.ReactNode;
}> = ({ brand, children }) => (
  <BrandContext.Provider value={BRANDS[brand ?? DEFAULT_BRAND] ?? BRANDS[DEFAULT_BRAND]}>
    {children}
  </BrandContext.Provider>
);

export const useBrand = (): Brand => useContext(BrandContext);
