export {
  editRecipeSchema,
  filtersSchema,
  borderSchema,
  captionSchema,
  cropSchema,
  FRAME_TYPES,
  ASPECT_RATIOS,
  CAPTION_STYLES,
  type EditRecipe,
  type Filters,
  type Border,
  type Caption,
  type Crop,
  type FrameType,
  type AspectRatio,
  type CaptionStyle,
} from "./recipe/schema";

export {
  DEFAULT_FILTERS,
  DEFAULT_BORDER,
  DEFAULT_CROP,
  CAPTION_TEMPLATE,
  createCaption,
  createDefaultRecipe,
  cloneRecipe,
  normalizeRecipe,
  isIdentityRecipe,
  areFiltersDefault,
} from "./recipe/defaults";

export {
  EXPORT_FORMATS,
  FORMAT_INFO,
  DEFAULT_EXPORT_OPTIONS,
  encodeSettings,
  formatFilename,
  type ExportFormat,
  type ExportOptions,
  type FormatInfo,
} from "./export/types";
export { ExportRenderer } from "./export/render";

export {
  registerFilter,
  getFilter,
  listFilters,
  listFiltersByGroup,
  filterCount,
} from "./filters/registry";
export {
  uniformName,
  type FilterDefinition,
  type FilterGroup,
  type ColorSpace,
} from "./filters/types";
export { registerBuiltinFilters } from "./filters/builtin";

export {
  FilterRenderer,
  type RenderCanvas,
} from "./render/filter-renderer";
export {
  buildFragmentShader,
  VERTEX_SHADER_NEUTRAL,
  VERTEX_SHADER_PRESENT,
} from "./render/glsl";

export {
  registerFrame,
  getFrame,
  listFrames,
  computeFrameLayout,
  scaleLayout,
} from "./frames/registry";
export { registerBuiltinFrames } from "./frames/builtin";
export {
  aspectValue,
  borderUnit,
  type FrameDefinition,
  type FrameLayout,
  type FramePadding,
  type FrameCanvasContext,
  type Rect,
  type Size,
} from "./frames/types";
export { roundedRectPath, shadeColor } from "./frames/draw";
export {
  measureCaption,
  hasCaption,
  fontString,
  FONT_STACKS,
  FONT_LABELS,
  type CaptionMetrics,
} from "./caption/layout";
export { drawCaption, captionBox } from "./caption/render";
export { composite, type CompositeInput } from "./render/compositor";

export {
  BUILTIN_PRESETS,
  applyPreset,
  findPreset,
  type FilterPreset,
  type PresetGroup,
} from "./presets/builtin";
export { FUJIFILM_PRESETS } from "./presets/fujifilm";

export {
  collageSchema,
  collageCellSchema,
  type Collage,
  type CollageCell,
} from "./collage/schema";
export {
  DEFAULT_GAP_PCT,
  DEFAULT_GAP_COLOR,
  DEFAULT_COLLAGE_BORDER_WIDTH_PCT,
  DEFAULT_COLLAGE_BORDER_COLOR,
  DEFAULT_COLLAGE_RADIUS_PCT,
  EMPTY_CELL,
  createDefaultCollage,
  normalizeCollage,
  resizeCells,
  emptyCells,
} from "./collage/defaults";
export {
  computeCollageLayout,
  collageCanvasSize,
  coverFit,
  coverFitTransform,
  type CollageLayout,
  type CollageCellRect,
  type CoverFit,
} from "./collage/layout";
export {
  renderCollage,
  type CollageSource,
  type CollageRenderInput,
} from "./collage/render";
export {
  resolveCollageSources,
  type CollageCellInput,
  type ResolvedCollageSources,
} from "./collage/resolve";
export {
  CollageExportRenderer,
  type CollageCellSource,
} from "./collage/export";
