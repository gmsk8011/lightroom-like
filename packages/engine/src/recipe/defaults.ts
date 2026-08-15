import type { Border, Caption, EditRecipe, Filters } from "./schema";

export const DEFAULT_FILTERS: Filters = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  clarity: 0,
  grain: 0,
  vignette: 0,
  preset: null,
};

export const DEFAULT_BORDER: Border = {
  type: "none",
  widthPct: 5,
  color: "#ffffff",
  aspect: "original",
  radiusPct: 0,
  lineWidthPct: 0.4,
  lineColor: "#1a1a1a",
  shadowSizePct: 0,
  shadowOpacity: 0.35,
};

export const DEFAULT_CAPTION: Caption = {
  enabled: false,
  text: "",
  fontFamily: "Inter",
  fontWeight: 400,
  sizePct: 2.4,
  color: "#1a1a1a",
  opacity: 1,
  align: "center",
  positionX: 50,
  positionY: 88,
  letterSpacing: 0,
  uppercase: false,
  shadowEnabled: false,
  shadowOpacity: 0.5,
  backgroundEnabled: false,
  backgroundColor: "#000000",
  backgroundOpacity: 0.5,
};

export function createDefaultRecipe(): EditRecipe {
  return {
    version: 1,
    filters: { ...DEFAULT_FILTERS },
    border: { ...DEFAULT_BORDER },
    caption: { ...DEFAULT_CAPTION },
  };
}

export function cloneRecipe(recipe: EditRecipe): EditRecipe {
  return {
    version: 1,
    filters: { ...recipe.filters },
    border: { ...recipe.border },
    caption: { ...recipe.caption },
  };
}

/** True when no filter would change a pixel — lets export skip the GPU pass. */
export function areFiltersDefault(filters: Filters): boolean {
  return (Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]).every(
    (k) => k === "preset" || filters[k] === DEFAULT_FILTERS[k],
  );
}

/** True when the recipe would leave pixels untouched — used to skip work. */
export function isIdentityRecipe(recipe: EditRecipe): boolean {
  const filtersClean = areFiltersDefault(recipe.filters);
  const borderClean =
    recipe.border.type === "none" && recipe.border.aspect === "original";
  const captionClean = !recipe.caption.enabled || !recipe.caption.text.trim();
  return filtersClean && borderClean && captionClean;
}
