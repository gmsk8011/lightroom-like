import type { Border, Caption, Crop, EditRecipe, Filters } from "./schema";

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

export const DEFAULT_CROP: Crop = null;

/** Value template for a new caption — everything but the id, which
 *  `createCaption` mints fresh so multiple captions on one photo never
 *  collide. */
export const CAPTION_TEMPLATE: Omit<Caption, "id"> = {
  text: "",
  fontFamily: "Inter",
  fontWeight: 400,
  sizePct: 2.4,
  color: "#1a1a1a",
  opacity: 1,
  align: "center",
  style: "fill",
  borderColor: "#ffffff",
  borderWidthPct: 8,
  positionX: 50,
  positionY: 88,
  letterSpacing: 0,
  uppercase: false,
  shadowEnabled: false,
  shadowOpacity: 0.5,
  backgroundEnabled: false,
  backgroundColor: "#000000",
  backgroundOpacity: 0.5,
  boxWidthPct: 0,
  boxHeightPct: 0,
};

function newCaptionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `caption-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Creates a new, independently-positioned caption. Each call to
 *  `addCaption` on the store goes through here so ids never collide within
 *  a photo's caption list. */
export function createCaption(overrides: Partial<Omit<Caption, "id">> = {}): Caption {
  return { id: newCaptionId(), ...CAPTION_TEMPLATE, ...overrides };
}

export function createDefaultRecipe(): EditRecipe {
  return {
    version: 1,
    filters: { ...DEFAULT_FILTERS },
    border: { ...DEFAULT_BORDER },
    crop: DEFAULT_CROP,
    captions: [],
  };
}

export function cloneRecipe(recipe: EditRecipe): EditRecipe {
  return {
    version: 1,
    filters: { ...recipe.filters },
    border: { ...recipe.border },
    crop: recipe.crop ? { ...recipe.crop } : null,
    captions: recipe.captions.map((c) => ({ ...c })),
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
  const cropClean = recipe.crop === null;
  const captionsClean = recipe.captions.every((c) => !c.text.trim());
  return filtersClean && borderClean && cropClean && captionsClean;
}
