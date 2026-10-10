# IRON 100 — Chest Exercise Research Pack v1

**Purpose:** evidence-informed exercise library and recommendation inputs for Chest and Upper Chest. This is research for the product team, not text to expose in the normal UI.

**Status:** Candidate research pack for careful merge into the existing IRON 100 exercise library. It is not a universal leaderboard and has not yet been merged into the app.

## Executive summary

The most defensible Chest recommendation system is not a single ordered list that declares a universal winner. It is a contextual shortlist built from suitable pressing options, complementary fly options, the user’s goal, equipment, comfort, and progression ability. Current evidence supports progressive resistance training for growth, but direct long-term head-to-head trials that rank common chest exercises are limited. The 2026 ACSM overview synthesizes 137 systematic reviews and more than 30,000 participants; it finds resistance training improves muscle size and highlights higher weekly volume as a useful hypertrophy variable, while equipment type and many other variables do not consistently produce a single superior result. [S1]

**Public-facing labels stay simple:** `Chest`, `Upper Chest`, familiar exercise names, recommendation labels, Add/Remove, and short Nerd Facts. Do not show internal target IDs, evidence grades, EMG discussion, or scientific uncertainty notes on the exercise cards. Keep those notes in the internal database.

## What to call the muscle areas

- **Chest:** broad pectoralis-major target, with the triceps and front shoulders as common secondary contributors during pressing.
- **Upper Chest:** a simple user-facing emphasis for movements that may shift more demand toward the clavicular region, especially moderate-incline presses. It is not a separate muscle that any movement completely isolates.

The pectoralis major has clavicular and sternocostal/costal regions whose contribution can shift with the pressing angle. Anatomy and regional EMG support this as an emphasis concept, not a promise of perfect regional isolation. [S3–S7, S14]

## Evidence interpretation rules

1. **Direct, longitudinal growth findings are more relevant to hypertrophy than acute EMG.** EMG describes electrical activity in a particular tested condition; it does not, by itself, tell us which exercise will grow a muscle most over months.
2. **Do not over-read incline studies.** A randomized 8-week study in 47 untrained young men found similar general strength changes across horizontal, incline, and combined training, with one measured thickness site favoring incline-only training. This is interesting evidence for considering angles, but not proof that incline pressing grows the entire chest more. [S2]
3. **A moderate incline is a strong Upper Chest candidate, not a compulsory exact angle.** In one acute study of 30 trained adults, 30 degrees produced the greatest upper-portion pectoralis EMG among the tested angles, while steeper inclines increased front-deltoid activity and reduced pectoralis activity. Other studies report partly different patterns, including differences only in portions of the lift. [S3–S5]
4. **Flat pressing remains a strong general Chest exercise.** Flat and incline versions can complement each other. Regional excitation differences are plausible, but exercise angle does not isolate a muscle region completely. [S2–S6]
5. **Machine, free-weight, cable, and bodyweight options can all belong in the library.** A 2023 meta-analysis did not detect an overall hypertrophy difference between free-weight and machine training, although the evidence base for hypertrophy was limited and not chest-specific. [S8, S13]
6. **Push-ups are real exercise options, not inferior items to hide.** An 8-week study of 18 young men found similar pectoralis thickness improvements in load-matched low-load bench-press and push-up groups. A separate small, shorter study found progressive push-up training can improve strength. Applicability is limited by small samples and particular protocols, but this supports including scaled push-ups as options. [S9, S10]
7. **Exercise variation should be purposeful.** A systematic review found some support for systematic variation, but excessive random switching may be counterproductive. IRON 100 should offer useful alternatives without implying users need a huge number of chest movements. [S11]
8. **Nerd Facts must reflect evidence honestly.** Never state that a grip, angle, machine, cable direction, or fly variant guarantees superior growth unless direct evidence establishes that outcome.

## Recommendation map

### Chest — foundational pressing options

**Strong first-line candidates for a hypertrophy-focused user:**

- Barbell Bench Press
- Dumbbell Bench Press
- Chest Press Machine
- Smith Machine Bench Press
- Cable Chest Press
- Push-Up / Weighted Push-Up

These are candidates, not a definitive 1-to-6 scientific ranking. Choose between them based on fit, available equipment, comfort, stability, user's training goal, and ability to progress. A bench-press EMG systematic review found substantial pectoralis-major and triceps involvement, which is a reminder that presses are compound movements. [S7]

### Upper Chest — emphasized pressing options

**Strong candidates:**

- Incline Dumbbell Press
- Incline Barbell Bench Press
- Incline Machine Press
- Smith Machine Incline Press
- Low-Incline Dumbbell Press / Low-Incline Barbell Press (only if not duplicate angle variants)
- Incline Cable Press (if setup supports it)

A moderate incline is a sensible starting point for Upper Chest recommendations. Avoid hardcoding exactly 30 degrees or promising isolation. Steeper angles tend to increase front-shoulder contribution in some acute studies. [S3–S5]

### Chest — complementary fly/accessory options

- Cable Fly / Cable Crossover
- Pec Deck Fly / Machine Chest Fly
- Dumbbell Fly
- Incline Dumbbell Fly
- High-to-Low Cable Fly
- Low-to-High Cable Fly

Fly variations give users an alternative movement pattern and can be easy to standardize. Direct long-term research proving that one fly variation is superior to another, or to presses, is insufficient for a universal ranking. Treat them as complementary choices rather than magic isolation movements.

### Chest — additional valid alternatives

- Chest Dip / Assisted Chest Dip
- Decline Bench Press / Decline Dumbbell Press
- Floor Press
- Dumbbell Squeeze Press
- Resistance-Band Chest Press / Fly
- Incline Push-Up / Decline Push-Up
- Close-Grip Bench Press (valid compound option but often relatively triceps-focused)

Do not hide any otherwise valid exercise solely because it is not the top recommendation. Exercise relevance, available equipment and Gym/Home compatibility are the hard eligibility checks. Goal, physique priority and recommendation score should affect order and FOR YOU qualification only.

## Proposed personalized recommendation behavior

### User: Muscle Gain + Aesthetic + Upper Chest priority + selected `Upper Chest`

Likely strong matches when equipment-compatible:
- Incline Dumbbell Press
- Incline Barbell Bench Press
- Incline Machine Press
- Smith Machine Incline Press
- Low-to-High Cable Fly or Incline Cable Press as complementary options

Flat pressing, push-ups, dips, and fly variants remain selectable as valid alternatives, even if not marked FOR YOU for this context.

### User: Muscle Gain + selected `Chest`, no special regional priority

Strong candidates can include flat barbell/dumbbell pressing, a compatible chest-press machine, Smith press, progressive push-ups, cable press, and complementary fly movements. The exact order should depend on context and practical fit rather than a universal scientific claim.

### User: Strength + selected `Chest`

A user who explicitly prioritizes barbell bench strength can receive barbell bench press as a stronger goal match. Do not remove machine pressing or push-ups; the goal changes recommendation order, not eligibility.

## Internal exercise metadata

For each candidate, keep the following internally: stable ID or match aliases, simple display name, visible category tags, primary targets, secondary targets, movement pattern, recommendation role, intended focus, actual equipment requirements, Gym/Home compatibility, practical-fit descriptors, sources, research finding, caveats, and short Nerd Fact. See `iron100_chest_exercise_seed_v1.json`.

Important: candidate rows are **merge hints**, not instructions to append every row blindly. Some rows represent a variant/alias such as a low-incline press or a particular machine style. If current IRON 100 stores angle as a setup option or already has a semantically equivalent exercise, merge aliases/metadata into that existing record rather than duplicating it.

## Source register

- **[S1]** Currier BS et al. (2026). *Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews.* PMID 41843416. https://pubmed.ncbi.nlm.nih.gov/41843416/ — broad programming source; search current to October 2024.
- **[S2]** Chaves SFN et al. (2020). *Effects of Horizontal and Incline Bench Press on Neuromuscular Adaptations in Untrained Young Men.* PMID 32922646; DOI 10.70252/FDNB1158. https://pubmed.ncbi.nlm.nih.gov/32922646/ — 8-week randomized study; regional site result, untrained male sample.
- **[S3]** Rodríguez-Ridao D et al. (2020). *Effect of Five Bench Inclinations on the Electromyographic Activity of the Pectoralis Major, Anterior Deltoid, and Triceps Brachii during the Bench Press Exercise.* PMID 33049982; DOI 10.3390/ijerph17197339. https://pubmed.ncbi.nlm.nih.gov/33049982/ — acute EMG, 30 trained adults.
- **[S4]** Lauver JD et al. (2016). *Influence of bench angle on upper extremity muscular activation during bench press exercise.* PMID 25799093; DOI 10.1080/17461391.2015.1022605. https://pubmed.ncbi.nlm.nih.gov/25799093/ — acute EMG, 14 trained men; differences varied by phase.
- **[S5]** Cabral HV et al. (2022). *Non-uniform excitation of the pectoralis major muscle during flat and inclined bench press exercises.* PMID 34644424; DOI 10.1111/sms.14082. https://pubmed.ncbi.nlm.nih.gov/34644424/ — high-density EMG; sample of eight.
- **[S6]** Cabral HV et al. (2022). *Non-uniform excitation of pectoralis major induced by changes in bench press inclination leads to uneven variations in the cross-sectional area measured by panoramic ultrasonography.* PMID 36334406; DOI 10.1016/j.jelekin.2022.102722. https://pubmed.ncbi.nlm.nih.gov/36334406/ — immediate pre/post exercise response, not a longitudinal growth trial.
- **[S7]** Stastny P et al. (2017). *A systematic review of surface electromyography analyses of the bench press movement task.* PMID 28170449; DOI 10.1371/journal.pone.0171632. https://pubmed.ncbi.nlm.nih.gov/28170449/ — systematic review of acute EMG.
- **[S8]** Haugen ME et al. (2023). *Effect of free-weight vs. machine-based strength training on maximal strength, hypertrophy and jump performance: a systematic review and meta-analysis.* PMID 37582807; DOI 10.1186/s13102-023-00713-4. https://pubmed.ncbi.nlm.nih.gov/37582807/ — no overall hypertrophy difference detected; only five studies measured hypertrophy.
- **[S9]** Kikuchi N, Nakazato K (2017). *Low-load bench press and push-up induce similar muscle hypertrophy and strength gain.* PMID 29541130; DOI 10.1016/j.jesf.2017.06.003. https://pubmed.ncbi.nlm.nih.gov/29541130/ — 18 young men, 8 weeks.
- **[S10]** Kikuchi N et al. (2018). *Effect of Progressive Calisthenic Push-up Training on Muscle Strength and Thickness.* PMID 29466268; DOI 10.1519/JSC.0000000000002345. https://pubmed.ncbi.nlm.nih.gov/29466268/ — small, four-week study; strength improved, no significant within-group muscle-thickness differences.
- **[S11]** Kassiano W et al. (2022). *Does Varying Resistance Exercises Promote Superior Muscle Hypertrophy and Strength Gains? A Systematic Review.* PMID 35438660; DOI 10.1519/JSC.0000000000004258. https://pubmed.ncbi.nlm.nih.gov/35438660/ — 8 studies, 241 participants, all young men.
- **[S12]** Schoenfeld BJ et al. (2023). *Resistance training prescription for muscle strength and hypertrophy in healthy adults: a systematic review and Bayesian network meta-analysis.* PMID 37414459; DOI 10.1136/bjsports-2023-106807. https://pubmed.ncbi.nlm.nih.gov/37414459/ — broad programming, not chest exercise comparison.
- **[S13]** Heidel KA et al. (2022). *Machines and free weight exercises: a systematic review and meta-analysis comparing changes in muscle size, strength, and power.* PMID 34609100; DOI 10.23736/S0022-4707.21.12929-9. https://pubmed.ncbi.nlm.nih.gov/34609100/ — broad equipment comparison.
- **[S14]** StatPearls. *Anatomy, Shoulder and Upper Limb, Pectoral Muscles.* https://www.ncbi.nlm.nih.gov/books/NBK545241/ — anatomy context only, not exercise superiority evidence.
- **[S15]** *Specific prime movers' excitation during free-weight bench press variations and chest press machine in competitive bodybuilders.* (2019). PMID 31397215; DOI 10.1080/17461391.2019.1655101. https://pubmed.ncbi.nlm.nih.gov/31397215/ — acute EMG comparison, 10 competitive bodybuilders.

## What we still need to verify in the codebase

1. Existing category IDs for `Chest` and `Upper Chest` must be reused exactly.
2. Existing exercise records must be mapped by stable IDs and normalized names/aliases, with updates preferred over new duplicates.
3. The live recommendation score and FOR YOU component must be preserved; do not create a second Back/Chest-only algorithm.
4. Existing Gym/Home and equipment filters must remain correct.
5. After merging, run the existing automated suite, lint/type checks, and production build, then manually inspect the browser for Chest and Upper Chest.
6. Do not claim the browser is verified unless someone actually observes the running app.
