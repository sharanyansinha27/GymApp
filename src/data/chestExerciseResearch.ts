import chestResearchPack from '../../iron100_chest_exercise_seed_v1.json';

export type ChestResearchExercise = (typeof chestResearchPack.exercises)[number];
export type ChestResearchSource = (typeof chestResearchPack.sources)[number];

export interface ChestResearchCatalogMapping {
  catalogId: string;
  researchId: string;
  aliases: string[];
}

export const CHEST_RESEARCH_CATALOG_MAPPINGS: ChestResearchCatalogMapping[] = [
  { catalogId: 'barbell-bench-press', researchId: 'barbell-bench-press', aliases: [] },
  { catalogId: 'flat-dumbbell-press', researchId: 'dumbbell-bench-press', aliases: [] },
  { catalogId: 'smith-bench-press', researchId: 'smith-machine-bench-press', aliases: [] },
  {
    catalogId: 'machine-chest-press',
    researchId: 'chest-press-machine',
    aliases: ['chest-press-plate-loaded'],
  },
  {
    catalogId: 'incline-barbell-press',
    researchId: 'incline-barbell-bench-press',
    aliases: ['barbell-incline-low-angle-press'],
  },
  {
    catalogId: 'incline-dumbbell-press',
    researchId: 'incline-dumbbell-press',
    aliases: ['dumbbell-low-incline-press'],
  },
  { catalogId: 'incline-machine-chest-press', researchId: 'incline-machine-press', aliases: [] },
  { catalogId: 'smith-incline-press', researchId: 'smith-machine-incline-press', aliases: [] },
  { catalogId: 'incline-cable-chest-press', researchId: 'incline-cable-press', aliases: [] },
  { catalogId: 'decline-barbell-press', researchId: 'decline-bench-press', aliases: [] },
  { catalogId: 'decline-dumbbell-press', researchId: 'dumbbell-decline-press', aliases: [] },
  { catalogId: 'chest-dip', researchId: 'chest-dip', aliases: [] },
  { catalogId: 'assisted-chest-dip', researchId: 'assisted-chest-dip', aliases: [] },
  {
    catalogId: 'push-up',
    researchId: 'push-up',
    aliases: ['weighted-push-up', 'incline-push-up'],
  },
  { catalogId: 'cable-chest-press', researchId: 'cable-chest-press', aliases: ['single-arm-cable-chest-press'] },
  { catalogId: 'cable-chest-fly', researchId: 'cable-fly', aliases: [] },
  { catalogId: 'cable-high-to-low-fly', researchId: 'high-to-low-cable-fly', aliases: [] },
  { catalogId: 'cable-low-to-high-fly', researchId: 'low-to-high-cable-fly', aliases: [] },
  {
    catalogId: 'pec-deck',
    researchId: 'pec-deck-fly',
    aliases: ['machine-chest-fly'],
  },
  { catalogId: 'dumbbell-fly', researchId: 'dumbbell-fly', aliases: [] },
  { catalogId: 'dumbbell-floor-press', researchId: 'barbell-floor-press', aliases: [] },
  { catalogId: 'band-chest-press', researchId: 'band-chest-press', aliases: [] },
  { catalogId: 'band-chest-fly', researchId: 'band-chest-fly', aliases: [] },
  { catalogId: 'close-grip-bench-press', researchId: 'close-grip-bench-press', aliases: [] },
];

const researchById = new Map(
  chestResearchPack.exercises.map((exercise) => [exercise.id, exercise])
);
const researchByCatalogId = new Map<string, ChestResearchExercise>();
for (const mapping of CHEST_RESEARCH_CATALOG_MAPPINGS) {
  const research = researchById.get(mapping.researchId);
  if (!research) {
    throw new Error(`Chest research entry not found: ${mapping.researchId}`);
  }
  if (researchByCatalogId.has(mapping.catalogId)) {
    throw new Error(`Duplicate Chest research mapping for exercise: ${mapping.catalogId}`);
  }
  researchByCatalogId.set(mapping.catalogId, research);
}

const sourcesById = new Map(
  chestResearchPack.sources.map((source) => [source.id, source])
);

export function getChestResearchForExercise(
  catalogExerciseId: string
): ChestResearchExercise | undefined {
  return researchByCatalogId.get(catalogExerciseId);
}

export function getChestResearchSources(
  sourceIds: readonly string[]
): ChestResearchSource[] {
  return sourceIds.map((sourceId) => {
    const source = sourcesById.get(sourceId);
    if (!source) {
      throw new Error(`Chest research source not found: ${sourceId}`);
    }
    return source;
  });
}

export function getChestResearchCatalogIds(researchId: string): string[] {
  return CHEST_RESEARCH_CATALOG_MAPPINGS
    .filter(
      (mapping) =>
        mapping.researchId === researchId || mapping.aliases.includes(researchId)
    )
    .map(({ catalogId }) => catalogId);
}
