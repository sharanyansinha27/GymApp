import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ExerciseDefinition } from '../types';
import {
  getExerciseRecommendationExplanation,
  getExerciseScienceContent,
} from '../data/exerciseScience';
import { getCompatibleExerciseAlternatives } from '../data/exerciseLibrary';

interface ExerciseFactModalProps {
  exercise: ExerciseDefinition;
  recommendationLabel: string;
  selectedBodyPart: string;
  workoutMode: 'gym' | 'home';
  availableEquipment: string[];
  onClose: () => void;
}

export const ExerciseFactModal: React.FC<ExerciseFactModalProps> = ({
  exercise,
  recommendationLabel,
  selectedBodyPart,
  workoutMode,
  availableEquipment,
  onClose,
}) => {
  const science = getExerciseScienceContent(exercise);
  const alternatives = getCompatibleExerciseAlternatives(
    exercise,
    workoutMode,
    availableEquipment
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-fact-title"
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-slate-700 bg-[#111827] p-5 text-slate-200 shadow-2xl sm:rounded-2xl sm:p-7"
      >
        <header className="sticky top-0 -mx-5 -mt-5 mb-5 flex items-start justify-between gap-4 border-b border-slate-700 bg-[#111827] px-5 py-4 sm:-mx-7 sm:-mt-7 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Exercise information
            </p>
            <h2 id="exercise-fact-title" className="mt-1 text-xl font-bold text-white">
              {exercise.name}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close exercise information"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-base font-bold text-white">Exercise overview</h3>
            <p className="text-xs leading-5 text-slate-400">
              Muscle groups and movement pattern are IRON 100 catalog classifications, not exercise-specific muscle-activation measurements.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <OverviewItem label="Primary muscle" value={exercise.primaryMuscles.join(', ')} />
              <OverviewItem label="Category" value={exercise.category} />
              <OverviewItem
                label="Secondary muscles"
                value={exercise.secondaryMuscles.join(', ') || 'None listed'}
              />
              <OverviewItem label="Equipment" value={exercise.equipment.join(', ')} />
              <OverviewItem label="Movement pattern" value={exercise.movementPattern} />
              <OverviewItem
                label="Difficulty"
                value={exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
              />
              <OverviewItem
                label="Suitable for"
                value={exercise.trainingModes.map((mode) => mode === 'gym' ? 'Gym' : 'Home').join(' / ')}
              />
            </dl>
            {alternatives.length > 0 && (
              <p className="text-xs leading-5 text-slate-400">
                Compatible alternatives: {alternatives.map(({ name }) => name).join(', ')}.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-bold text-white">Why is this exercise recommended?</h3>
            <p className="text-sm leading-6 text-slate-300">
              {getExerciseRecommendationExplanation(exercise, selectedBodyPart, workoutMode)}
            </p>
            <p className="text-xs text-slate-400">
              Current IRON 100 ranking: {recommendationLabel}. This reflects the app&apos;s programming criteria.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-bold text-white">How it works</h3>
            <p className="text-sm leading-6 text-slate-300">
              {science.movementExplanation || 'Reliable evidence unavailable for this specific claim.'}
            </p>
            <p className="text-sm leading-6 text-slate-300">
              The catalog associates this exercise with the muscle(s) listed in the overview. A specific upper/lower or other regional emphasis has not been established for this exercise in the app&apos;s evidence set.
            </p>
            <p className="text-xs text-slate-400">
              Technique: {exercise.formCues.join(' ')}
            </p>
            <p className="text-xs text-slate-400">
              Exercise-specific muscle activation and regional comparisons: Reliable evidence unavailable for this specific claim.
            </p>
          </section>

          <section className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <h3 className="text-base font-bold text-emerald-200">Science / Nerd Fact 🧠</h3>
            {science.facts.map((fact) => (
              <div key={fact.text} className="space-y-1">
                <p className="text-sm leading-6 text-slate-200">{fact.text}</p>
                <p className="text-xs text-slate-400">
                  Sources:{' '}
                  {fact.sourceIds.map((sourceId, index) => {
                    const source = science.sources.find((item) => item.id === sourceId);
                    if (!source) return null;
                    const sourceNumber = science.sources.indexOf(source) + 1;
                    return (
                      <React.Fragment key={sourceId}>
                        {index > 0 ? ', ' : ''}
                        <a
                          href={`#exercise-source-${source.id}`}
                          className="text-emerald-300 underline underline-offset-2"
                        >
                          {sourceNumber}
                        </a>
                      </React.Fragment>
                    );
                  })}
                </p>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-bold text-white">Sources</h3>
            <p className="text-xs leading-5 text-slate-400">
              The studies below support the general training findings above; they do not establish that this exercise is better than another specific movement.
            </p>
            <ol className="space-y-3">
              {science.sources.map((source, index) => (
                <li
                  key={source.id}
                  id={`exercise-source-${source.id}`}
                  className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm"
                >
                  <p className="font-semibold text-slate-100">
                    {index + 1}. {source.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {source.authors}. {source.journal}, {source.year}. DOI: {source.doi}.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <a
                      href={source.pubmedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-[32px] inline-flex items-center text-emerald-300 underline underline-offset-2"
                    >
                      PubMed record
                    </a>
                    <a
                      href={source.doiUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-[32px] inline-flex items-center text-emerald-300 underline underline-offset-2"
                    >
                      DOI
                    </a>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs text-slate-400">
              Exercise-specific comparative claims: Reliable evidence unavailable for this specific claim.
            </p>
          </section>
        </div>

        <footer className="sticky bottom-0 -mx-5 -mb-5 mt-6 border-t border-slate-700 bg-[#111827] px-5 py-4 sm:-mx-7 sm:-mb-7 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full rounded-lg border border-slate-600 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
};

const OverviewItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-slate-900/70 p-3">
    <dt className="text-xs font-medium text-slate-400">{label}</dt>
    <dd className="mt-1 text-sm text-slate-100">{value}</dd>
  </div>
);
