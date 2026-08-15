import { registerFilter } from "../registry";
import { filterCount } from "../registry";
import { LIGHT_FILTERS } from "./light";
import { COLOR_FILTERS } from "./color";
import { EFFECT_FILTERS } from "./effects";

/**
 * Idempotent so hot reload and repeated imports don't throw on double
 * registration.
 */
export function registerBuiltinFilters(): void {
  if (filterCount() > 0) return;
  for (const definition of [
    ...LIGHT_FILTERS,
    ...COLOR_FILTERS,
    ...EFFECT_FILTERS,
  ]) {
    registerFilter(definition);
  }
}
