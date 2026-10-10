import React from 'react';
import { ExerciseRecommendationGroup } from '../data/programOnboardingFlow';
import { RankedExercise } from '../data/exerciseLibrary';

interface ExerciseRecommendationGroupsProps {
  groups: ExerciseRecommendationGroup[];
  renderExerciseCard: (item: RankedExercise, index: number) => React.ReactNode;
}

export const ExerciseRecommendationGroups: React.FC<
  ExerciseRecommendationGroupsProps
> = ({ groups, renderExerciseCard }) => {
  let displayIndex = 0;

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.title} className="space-y-3">
          <h3 className="text-base font-bold text-white">{group.title}</h3>
          <div className="max-h-[65vh] space-y-3 overflow-y-auto overscroll-contain pr-2 [touch-action:pan-y]">
            {group.exercises.map((item) => {
              displayIndex += 1;
              return renderExerciseCard(item, displayIndex);
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
