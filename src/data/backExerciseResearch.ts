import backResearchPack from '../../iron100_back_exercise_seed_v1.json';

export type BackResearchExercise = (typeof backResearchPack.exercises)[number];
export type BackResearchSource = (typeof backResearchPack.sources)[number];

const catalogIdAliases: Record<string, string[]> = {
  'one-arm-cable-pulldown': ['single-arm-cable-pulldown'],
  'machine-row': ['machine-high-row', 'machine-low-row'],
  'one-arm-cable-row': ['single-arm-cable-row'],
  'reverse-fly': ['rear-delt-fly'],
};

export const BACK_RESEARCH_CATALOG_MAPPINGS = backResearchPack.exercises.flatMap(
  (entry) => ({
    researchId: entry.id,
    catalogIds: catalogIdAliases[entry.id] || [entry.id],
  })
);

const researchByCatalogId = new Map<string, BackResearchExercise>();
for (const mapping of BACK_RESEARCH_CATALOG_MAPPINGS) {
  const research = backResearchPack.exercises.find(
    (entry) => entry.id === mapping.researchId
  );
  if (!research) {
    throw new Error(`Back research entry not found: ${mapping.researchId}`);
  }
  for (const catalogId of mapping.catalogIds) {
    if (researchByCatalogId.has(catalogId)) {
      throw new Error(`Duplicate Back research mapping for exercise: ${catalogId}`);
    }
    researchByCatalogId.set(catalogId, research);
  }
}

const sourcesById = new Map(
  backResearchPack.sources.map((source) => [source.id, source])
);

export function getBackResearchForExercise(
  catalogExerciseId: string
): BackResearchExercise | undefined {
  return researchByCatalogId.get(catalogExerciseId);
}

export function getBackResearchSources(
  sourceIds: readonly string[]
): BackResearchSource[] {
  return sourceIds.map((sourceId) => {
    const source = sourcesById.get(sourceId);
    if (!source) {
      throw new Error(`Back research source not found: ${sourceId}`);
    }
    return source;
  });
}

export function getBackResearchCatalogIds(researchId: string): string[] {
  return BACK_RESEARCH_CATALOG_MAPPINGS.find(
    (mapping) => mapping.researchId === researchId
  )?.catalogIds ?? [];
}
