import type { FilterDefinition, FilterGroup } from "./types";

const registry = new Map<string, FilterDefinition>();

/**
 * Registering is how a filter enters the pipeline. The renderer builds its
 * shader from whatever is registered at first compile, and the UI builds its
 * controls from the same list — so a new filter needs no changes in either.
 */
export function registerFilter(definition: FilterDefinition): void {
  if (registry.has(definition.id)) {
    throw new Error(`Filter "${definition.id}" is already registered`);
  }
  registry.set(definition.id, definition);
}

export function getFilter(id: string): FilterDefinition | undefined {
  return registry.get(id);
}

/** All filters in pipeline order. */
export function listFilters(): FilterDefinition[] {
  return [...registry.values()].sort((a, b) => a.order - b.order);
}

export function listFiltersByGroup(group: FilterGroup): FilterDefinition[] {
  return listFilters().filter((f) => f.group === group);
}

export function filterCount(): number {
  return registry.size;
}
