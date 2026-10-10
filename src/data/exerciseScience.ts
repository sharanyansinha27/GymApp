import { ExerciseDefinition } from '../types';
import {
  getBackResearchForExercise,
  getBackResearchSources,
} from './backExerciseResearch';
import {
  getChestResearchForExercise,
  getChestResearchSources,
} from './chestExerciseResearch';

export interface ExerciseScienceSource {
  id: string;
  title: string;
  authors?: string;
  journal?: string;
  year: number;
  doi?: string;
  url: string;
  urlLabel: string;
  doiUrl?: string;
}

export interface ExerciseScienceFact {
  text: string;
  sourceIds: string[];
}

export const EXERCISE_SCIENCE_SOURCES: ExerciseScienceSource[] = [
  {
    id: 'resistance-training-loads-meta-analysis',
    title:
      'Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis',
    authors: 'Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW',
    journal: 'Journal of Strength and Conditioning Research',
    year: 2017,
    doi: '10.1519/JSC.0000000000002200',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28834797/',
    urlLabel: 'PubMed record',
    doiUrl: 'https://doi.org/10.1519/JSC.0000000000002200',
  },
  {
    id: 'weekly-training-volume-meta-analysis',
    title:
      'Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis',
    authors: 'Schoenfeld BJ, Ogborn D, Krieger JW',
    journal: 'Journal of Sports Sciences',
    year: 2017,
    doi: '10.1080/02640414.2016.1210197',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27433992/',
    urlLabel: 'PubMed record',
    doiUrl: 'https://doi.org/10.1080/02640414.2016.1210197',
  },
];

const MOVEMENT_EXPLANATIONS: Record<string, string> = {
  'Horizontal push':
    'The arms press forward in front of the torso. The chest, front shoulders, and elbow extensors listed above contribute to the press.',
  'Incline push':
    'The arms press forward from an inclined torso position. The catalog lists the upper chest and front shoulders as contributors.',
  'Horizontal adduction':
    'The upper arms move inward across the front of the body. This brings the arms toward the midline against resistance.',
  'Compound push':
    'This combines a pressing action with elbow extension. The catalog lists the chest and triceps as primary contributors.',
  'Vertical pull':
    'The arms pull down from overhead as the elbows bend. The lats and elbow flexors listed above contribute to the pull.',
  'Horizontal pull':
    'The arms pull toward the torso as the shoulder blades and elbows move. The back and elbow flexors listed above contribute.',
  'Shoulder abduction':
    'The upper arm moves away from the side of the body. The lateral deltoid is listed as the primary contributor.',
  'Vertical push':
    'The arms press upward overhead as the elbows extend. The shoulder muscles and triceps listed above contribute.',
  'Horizontal abduction':
    'The upper arms move outward and back from in front of the body. The rear shoulder muscles listed above contribute.',
  'Elbow flexion':
    'The elbow bends to bring the forearm toward the upper arm. The biceps and other listed elbow flexors contribute.',
  'Neutral-grip elbow flexion':
    'The elbow bends while the hands stay facing each other. The brachialis and forearm muscles listed above contribute.',
  'Elbow extension':
    'The elbow straightens against resistance. The triceps are listed as the primary contributor.',
  'Overhead elbow extension':
    'The elbow straightens while the upper arm is held overhead. The triceps are listed as the primary contributor.',
  Squat:
    'The hips and knees bend and then extend to lower and raise the body or load. The quadriceps and glutes listed above contribute.',
  'Single-leg squat':
    'The hips and knee of one working leg bend and extend to lower and raise the body or load. Balance and control are also needed.',
  'Knee extension':
    'The knee straightens against resistance. The quadriceps are listed as the primary contributor.',
  'Hip hinge':
    'The hips move back and then extend to raise the torso or load. The hamstrings and glutes listed above contribute.',
  'Knee flexion':
    'The knee bends against resistance. The hamstrings are listed as the primary contributor.',
  'Hip extension':
    'The hip moves from a bent position toward straight. The glutes are listed as the primary contributor.',
  'Plantar flexion':
    'The ankle points the foot down and then returns through a controlled range. The calf muscles listed above contribute.',
  'Trunk flexion':
    'The trunk curls against resistance. The abdominal muscles are listed as the primary contributor.',
  'Anti-extension':
    'The trunk resists arching while the limbs move or the body is held. The exercise is categorized as trunk anti-extension.',
  'Anti-extension isometric':
    'The trunk holds position and resists arching without visible repetitions. This is an isometric anti-extension exercise.',
};

export const EXERCISE_SCIENCE_FACTS: ExerciseScienceFact[] = [
  {
    text:
      'Across the studies in this meta-analysis, muscle growth was similar between low- and high-load training when sets were taken to momentary failure; heavier loads produced greater 1RM strength gains. These are broad training findings, not a test of this specific exercise.',
    sourceIds: ['resistance-training-loads-meta-analysis'],
  },
  {
    text:
      'A review and meta-analysis found a dose-response relationship between weekly resistance-training sets and muscle-size gains across the included studies. It does not establish a universal set target or guarantee that adding sets will help every person.',
    sourceIds: ['weekly-training-volume-meta-analysis'],
  },
];

export interface ExerciseScienceContent {
  movementExplanation: string | null;
  facts: ExerciseScienceFact[];
  sources: ExerciseScienceSource[];
}

export function getExerciseScienceContent(
  exercise: ExerciseDefinition
): ExerciseScienceContent {
  const backResearch = getBackResearchForExercise(exercise.id);
  if (backResearch) {
    const sources = getBackResearchSources(backResearch.evidenceRefs).map(
      (source) => ({
        id: source.id,
        title: source.title,
        year: source.year,
        doi: source.doi || undefined,
        url: source.url,
        urlLabel: source.pmid ? 'PubMed record' : 'Source page',
        doiUrl: source.doi
          ? `https://doi.org/${encodeURIComponent(source.doi)}`
          : undefined,
      })
    );
    return {
      movementExplanation:
        MOVEMENT_EXPLANATIONS[exercise.movementPattern] || null,
      facts: [
        {
          text: backResearch.nerdFact,
          sourceIds: backResearch.evidenceRefs,
        },
      ],
      sources,
    };
  }

  const chestResearch = getChestResearchForExercise(exercise.id);
  if (chestResearch) {
    const sources = getChestResearchSources(chestResearch.evidenceRefs).map(
      (source) => ({
        id: source.id,
        title: source.title,
        year: source.year,
        doi: source.doi || undefined,
        url: source.url,
        urlLabel: source.pmid ? 'PubMed record' : 'Source page',
        doiUrl: source.doi
          ? `https://doi.org/${source.doi}`
          : undefined,
      })
    );
    const nerdFact =
      chestResearch.id === 'chest-press-machine'
        ? 'A chest-press machine offers a stable alternative to free weights. Choose one that fits and lets you add resistance with control.'
        : chestResearch.nerdFact.join(' ');
    return {
      movementExplanation:
        MOVEMENT_EXPLANATIONS[exercise.movementPattern] || null,
      facts: [
        {
          text: nerdFact,
          sourceIds: chestResearch.evidenceRefs,
        },
      ],
      sources,
    };
  }

  const facts = EXERCISE_SCIENCE_FACTS;
  const sourceIds = new Set(facts.flatMap((fact) => fact.sourceIds));

  return {
    movementExplanation: MOVEMENT_EXPLANATIONS[exercise.movementPattern] || null,
    facts,
    sources: EXERCISE_SCIENCE_SOURCES.filter((source) => sourceIds.has(source.id)),
  };
}

export function getExerciseRecommendationExplanation(
  exercise: ExerciseDefinition,
  selectedBodyPart: string,
  mode: 'gym' | 'home'
): string {
  const modeLabel = mode === 'gym' ? 'gym' : 'home';
  return `IRON 100 programming recommendation: this ${modeLabel} option matches your selected ${selectedBodyPart} focus and is tagged as a ${exercise.movementPattern.toLowerCase()} pattern. This is the app's programming fit based on its catalog and ranking criteria, not a claim that research establishes it as superior to other exercises.`;
}
