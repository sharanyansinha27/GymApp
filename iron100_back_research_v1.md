# IRON 100 — Back Exercise Research Pack v1

**Status:** Evidence-reviewed first pass for internal product work. This is a recommendation foundation, not a claim that a universally best exercise has been scientifically established.

**Product rule:** The scientific detail stays inside the research/database. The user-facing app should keep body-part names and exercise names familiar, show a short exercise description, a simple `FOR YOU ⭐` tag where appropriate, and a concise Nerd Fact. Detailed methods, caveats, and citations can live behind the Nerd Fact's source link, not on the main exercise card.

## 1. Executive decision

The back database should treat *Back* as the broad group and distinguish three useful training emphases behind the scenes:

- **Lats / width:** vertical pulls and rows that load shoulder extension/adduction with the upper arm relatively close to the torso.
- **Upper back / thickness:** rows and reverse-fly-type movements that load the upper-back muscles and shoulder-blade retractors.
- **Lower back:** back-extension and hip-hinge patterns that train the spinal erectors, with different fatigue and technique demands.

Internally, track the upper, middle and lower parts of the trapezius separately. Keep `upper lats` and `lower lats` as optional *emphasis notes*, not separate muscles with guaranteed isolating exercises. Avoid user-facing claims such as “this exercise isolates the lower lats.”

## 2. What the evidence can and cannot tell us

There are many acute EMG studies comparing back exercises and configurations, but much less direct longitudinal research measuring growth from one specific back exercise versus another. As a result:

- The recommendations below combine the available exercise-specific evidence with anatomy, movement mechanics, progression potential and practical programming considerations.
- **EMG is not the same thing as muscle growth.** It can help compare activation under the tested conditions; it does not prove that one movement will produce more hypertrophy over months.
- A high recommendation means “a strong practical match for this target and goal,” not “proven universally superior to every alternative.”
- The current ACSM overview synthesized 137 systematic reviews and over 30,000 participants. It supports progressive resistance training and notes that higher weekly volume tends to benefit hypertrophy, while many other prescription variables have less consistent effects. This is broad resistance-training evidence, not a ranking of back exercises.
- A 2025 meta-analysis of 12 studies found generally trivial regional hypertrophy differences between shorter and longer mean muscle lengths in the included conditions. This is another reason not to promise exact regional isolation without direct evidence.

## 3. Simple product taxonomy

Keep visible labels familiar. Recommended visible labels for the current app: `Back`, `Lats`, `Upper Back`. If the product later benefits from more specific user choices, `Traps` and `Lower Back` are clear enough to be user-facing names; until then, keep them as internal tags rather than forcing a UI change.

Internal muscle targets:

- `latissimus_dorsi` — lats
- `teres_major` — assists several pulling movements; usually a secondary tag
- `trapezius_upper` — upper traps
- `trapezius_middle` — middle traps
- `trapezius_lower` — lower traps
- `rhomboids` — shoulder-blade retractors; commonly co-trained with middle traps
- `erector_spinae` — lower-back extensors
- `rear_deltoid` — often secondary in rows; primary in reverse-fly movements
- `elbow_flexors` — biceps and related elbow flexors, usually secondary on pulls

Do not label rows as “rhomboid isolation.” Do not label pulldown grip widths as guaranteed “upper-lat” or “lower-lat” isolation.

## 4. Lats — candidate ranking groups

### Strong first-choice candidates

1. **Lat Pulldown** — an excellent default because it is stable, easy to progress, scalable to different strength levels, and directly trains a vertical pulling pattern. Anterior/front-of-body bar paths have the most consistent EMG support in the recent review. Grip-width effects are inconsistent; do not rank wide grip as automatically best.
2. **Pull-up / Assisted Pull-up** — strong vertical-pull options. Assisted pull-ups are a valid way for users who cannot yet perform repeated strict pull-ups to train the same general pattern. Do not make one grip the universal winner; available studies often find broadly similar lat activation across variants.
3. **One-arm Cable Pulldown** — strong practical candidate due to adjustable line of pull, unilateral control and simple progression. Evidence does not establish unilateral training as inherently more hypertrophic, so its value is flexibility, comfort and programming fit.
4. **Seated Cable Row (lat-emphasis setup)** — strong horizontal-pull choice. A relatively close upper-arm path can make the movement more lat-oriented, but it still trains several muscles.
5. **Chest-Supported Row / Machine Row** — strong choices for progressive, repeatable rowing with little need to hold the torso in a bent-over position. They are practical recommendations, not proven to produce more lat growth than every free-weight alternative.

### Strong alternatives

- **One-arm Cable Row** — flexible line of pull and unilateral option.
- **One-arm Dumbbell Row** — useful, familiar horizontal pull; loading and torso support depend on the setup.
- **T-bar Row** — useful loadable row; muscle emphasis depends on handle, torso angle and elbow path.
- **Barbell Row** — effective compound row, but requires more trunk/hip isometric work and can create more low-back demand than supported rows.
- **Inverted Row** — useful scalable bodyweight horizontal pull. One small study of seven men found high lat and upper-back activation with relatively low lumbar loading compared with the tested bent-over row; treat this as a narrow acute finding, not proof of superiority.

### Accessory / lower-priority candidates for a lat-focused ranking

- **Straight-Arm Cable Pulldown** — a reasonable accessory and a way to train shoulder extension with little elbow flexion. Direct evidence of superior lat hypertrophy is limited; do not call it an ultimate isolation exercise.
- **Dumbbell Pullover** — retain as a valid exercise where it exists, but do not default-rank it at the top of a lat list. The 2026 lat EMG review reported that the pullover appeared to favor pectoralis major rather than selectively target the lats in the available evidence.

### Lat technique notes for research, not UI copy

- Pull the bar in front of the body rather than behind the neck as the normal default.
- Select a grip that allows comfortable range of motion and progressive loading; wide grip is not universally superior.
- In rows, the relationship between upper-arm path and torso influences which pulling muscles are emphasized. This is an emphasis, not isolation.
- Better execution matters: one small study in novice women found that expert technique instruction changed lat/teres-major versus biceps EMG during pulldowns. This supports clear technique cues, not a claim that “mind-muscle connection” alone determines growth.

## 5. Upper back — candidate ranking groups

### Main exercises for upper-back development

1. **Chest-Supported Row** — strong default for upper-back-focused rows; stable and easy to repeat and progress.
2. **Seated Cable Row** — strong alternative; the pull path and elbow position can change emphasis.
3. **Machine Row** — strong alternative with stable resistance and simple progression.
4. **T-bar Row** — strong compound alternative; setup determines trunk demands and emphasis.
5. **Barbell Row** — strong compound option, but account for trunk demands and the user's tolerance for unsupported rowing.
6. **One-arm Dumbbell/Cable Row** — flexible alternatives that can train the whole upper-back complex.

Rows train multiple muscles together. Middle traps and rhomboids both help move/control the shoulder blades; it is misleading to promise exact isolation between them. Fine-wire EMG research shows body and arm position can change their relative activation, but it was an acute study, not a long-term hypertrophy comparison.

### Upper-back accessories

- **Reverse Pec Deck / Reverse Fly** — a good direct rear-delt exercise with upper-back muscles contributing. Do not present it as a full replacement for a heavy row when the user's aim is upper-back mass.
- **Face Pull** — useful accessory for rear shoulders and shoulder-girdle musculature. Treat it as an accessory, not the default main mass-building upper-back exercise.
- **Prone Y Raise / Cable Y Raise** — primarily targeted accessory options for lower-trap emphasis, not a replacement for rows in a general upper-back hypertrophy list.

## 6. Traps — internal target map

### Upper traps

**First-choice candidates:** Dumbbell Shrug, Barbell Shrug, Machine Shrug, Cable Shrug.

**Alternative:** Farmer Carry. High-pull variations may suit strength/athletic goals but have more technical demands and should not be a default beginner recommendation.

A 30-person acute EMG study found unilateral shoulder shrug produced the greatest upper-trap activation among the ten tested exercises. That supports shrugs as a strong target-specific candidate; it does not prove that one shrug tool grows traps more than the others.

### Middle traps

**Main candidates:** Chest-Supported Row, Seated Cable Row, Machine Row, T-bar Row, Barbell Row.

**Accessory:** Reverse Fly / Reverse Pec Deck.

Treat middle traps and rhomboids as overlapping contributors to upper-back rows, not as muscles that can be perfectly isolated with a single cue.

### Lower traps

**Targeted candidates:** Prone Y Raise, Incline Y Raise, Cable Y Raise, Prone Row, Modified Prone Cobra.

The evidence base here is largely acute EMG and rehabilitation-oriented exercise research. A study with 18 healthy people found prone row and modified prone cobra among the stronger options for lower-trap activation while limiting upper/middle trap activation. These are sensible targeted accessories, but direct evidence that they outperform other exercises for lower-trap hypertrophy is not established. Avoid ranking them above heavy rows for overall back mass.

## 7. Lower back — internal target map

### Targeted candidates

- **45-degree Back Extension** — practical candidate for loaded back-extension training; execution determines how much the movement is a hip hinge versus spinal extension.
- **Machine Back Extension / Lumbar Extension** — can make direct trunk extension easy to standardize and load. Availability depends on the gym/home mode.

### Compound choices

- **Romanian Deadlift** — primarily a hamstring/glute hip-hinge exercise, with the spinal erectors working hard to stabilize the trunk. Do not label it an erector isolation exercise.
- **Deadlift** — useful for strength and whole-body posterior-chain work; it also places a substantial stabilization demand on the trunk. Do not automatically label it the “best back hypertrophy exercise.”
- **Good Morning** — a hip hinge that trains the posterior chain and imposes significant trunk stabilization demands; use as an advanced/experienced-user option rather than a default beginner recommendation.
- **Unsupported Barbell Row** — trains upper back and lats while the trunk holds the bent-over position; consider its low-back fatigue cost in exercise ranking.

The direct longitudinal evidence for lumbar-extension muscle hypertrophy is sparse. Older Roman-chair trials found improvements in endurance in some protocols but did not consistently show significant changes in isometric extension strength; these are not hypertrophy trials. Therefore the database should use measured language, not claim proven muscle-growth superiority for back extensions.

## 8. Evidence-informed recommendation tiers

These are *product recommendation tiers*, not scientific grades of certainty.

- **Core pick:** strong match for the selected back target; useful progression and broad practical suitability.
- **Strong alternative:** credible option that can be a first-choice exercise depending on preference, equipment and comfort.
- **Targeted accessory:** useful for a narrower focus but not a substitute for the main movement pattern.
- **Compound / strength option:** useful for strength or whole-body posterior-chain training, but with higher skill/fatigue demands.
- **Additional option:** valid, available and selectable, but less compelling as the main recommendation for that selected target.

Do not hide valid alternatives. Goal, physique and target priority change ranking, not eligibility. Genuine filters are selected body area, gym/home compatibility, equipment availability and valid exercise records.

## 9. Preliminary candidate map

| Exercise | Best initial fit | Other useful tags | Recommendation role | Key limitation |
|---|---|---|---|---|
| Lat Pulldown | Lats | Back | Core pick | Grip width is not a universal winner; EMG is not hypertrophy proof |
| Pull-up | Lats | Back | Core pick | May be too difficult for some users; provide assisted option |
| Assisted Pull-up | Lats | Back | Core pick | Progression depends on assistance settings |
| One-arm Cable Pulldown | Lats | Back | Core pick / strong alternative | Direct head-to-head hypertrophy evidence limited |
| Seated Cable Row | Lats or Upper Back depending on setup | Back | Core pick / strong alternative | Emphasis varies with arm path and torso position |
| Chest-Supported Row | Upper Back; can be lat-biased | Back, Lats | Core pick | Not proven universally superior to all rows |
| Machine Row | Upper Back; can be lat-biased | Back, Lats | Core pick / strong alternative | Specific machine path differs by model |
| One-arm Cable Row | Lats or Upper Back depending on setup | Back | Strong alternative | Line of pull changes emphasis |
| One-arm Dumbbell Row | Back / Upper Back / Lats depending on setup | — | Strong alternative | Torso support and execution vary |
| T-bar Row | Upper Back or Lats depending on grip/path | Back | Strong alternative | More trunk demand in unsupported variants |
| Barbell Row | Back / Upper Back / Lats | — | Compound option | More low-back demand than supported rowing in typical setups |
| Inverted Row | Back / Upper Back / Lats | — | Strong alternative | Single small acute comparison should not drive top rank alone |
| Straight-Arm Cable Pulldown | Lats | Back | Targeted accessory | Limited direct hypertrophy comparisons |
| Dumbbell Pullover | Chest / Back depending on database setup | — | Additional option | Available EMG review does not support calling it a selective lat exercise |
| Dumbbell Shrug | Traps | Upper Back, Back | Core pick for upper traps | No evidence that dumbbell is universally superior to other shrug tools |
| Barbell Shrug | Traps | Upper Back, Back | Core pick for upper traps | User comfort/equipment matters |
| Machine Shrug | Traps | Upper Back, Back | Core pick / strong alternative | Machine designs differ |
| Cable Shrug | Traps | Upper Back, Back | Strong alternative | Setup-dependent |
| Farmer Carry | Traps | Back | Additional / strength option | Grip and whole-body demands contribute significantly |
| Prone Y Raise | Upper Back / lower-trap emphasis | Back | Targeted accessory | Mostly EMG/rehab evidence, limited hypertrophy data |
| Incline Y Raise | Upper Back / lower-trap emphasis | Back | Targeted accessory | Similar limitation; practical setup varies |
| Cable Y Raise | Upper Back / lower-trap emphasis | Back | Targeted accessory | Direct hypertrophy comparisons limited |
| Prone Cobra | Upper Back / lower-trap emphasis | Back | Targeted accessory | Better viewed as targeted accessory than main mass movement |
| Reverse Pec Deck | Upper Back (rear-shoulder emphasis) | Back | Strong accessory | Rear delts are a major target; not a row substitute |
| Reverse Fly | Upper Back (rear-shoulder emphasis) | Back | Strong accessory | Setup/torso angle varies |
| Face Pull | Upper Back / rear shoulders | Back | Accessory | Do not treat as primary substitute for rows |
| 45-degree Back Extension | Lower back / posterior chain | Back | Core pick for targeted extension | Hip versus spine motion changes which muscles take more load |
| Machine Lumbar Extension | Lower back | Back | Core pick if available | Equipment availability; hypertrophy-specific evidence limited |
| Romanian Deadlift | Hamstrings / Glutes | Back (erectors secondary) | Compound / strength option | Not an erector isolation exercise |
| Deadlift | Posterior chain / strength | Back (erectors and upper back involved) | Compound / strength option | High technique/fatigue demand; not automatically best for back mass |
| Good Morning | Posterior chain / lower back stabilization | Back | Advanced compound option | High technique demands; not default for inexperienced users |

This is a candidate map for import and testing. The existing exercise library should be checked before adding anything, to avoid duplicate exercises.

## 10. Recommended Nerd Facts — user-facing copy examples

These should be short and plain. Keep technical references accessible via a source link, not in the visible paragraph.

- **Lat Pulldown:** “The bar path and how your elbows travel can change which pulling muscles do more of the work. A comfortable grip you can control and progress is usually a better choice than chasing an extra-wide grip.”
- **Pull-up:** “Pull-ups train your lats along with your arms and other back muscles. Different grips can work well, so choose one you can perform through a controlled range of motion.”
- **Seated Cable Row:** “Rows train several back muscles together. Keeping your movement controlled and using a repeatable pulling path makes it easier to track progress.”
- **Chest-Supported Row:** “The chest pad supports your torso, so you can focus more on the pull without having to hold yourself bent over.”
- **Straight-Arm Pulldown:** “This variation lets you pull through the shoulder with relatively little elbow bending. It works well as an accessory, but it isn't a magic lat-isolation exercise.”
- **Shrug:** “Shrugs directly train the upper traps, the muscles that help lift your shoulder blades. Dumbbell, barbell, cable and machine versions can all be useful.”
- **Prone Y Raise:** “The Y-shaped arm path is often used to target the lower traps. Research mainly compares short-term muscle activity, so it is best described as a targeted accessory rather than the proven best muscle-builder.”
- **Back Extension:** “Back extensions can train the muscles along your lower back, but the technique matters: hinging mostly at the hips shifts more work to the glutes and hamstrings.”
- **Romanian Deadlift:** “The Romanian deadlift mainly trains the hamstrings and glutes while your lower-back muscles help keep your torso steady.”
- **Barbell Row:** “Barbell rows train the lats and upper back while the trunk works to hold your position. Supported rows are another good choice when you want less demand on your lower back.”

These are draft examples, not final published copy; each fact must retain a source record and be reviewed against its source before shipping.

## 11. Data fields to retain behind the scenes

For each exercise, store:

- stable exercise ID and display name
- simple UI focus tags (Back, Lats, Upper Back)
- internal primary and secondary muscle targets
- movement pattern and equipment requirements
- gym/home compatibility
- recommendation role (core pick, strong alternative, accessory, compound option)
- practical factors (stability, ease of progression, skill demand, fatigue demand) with rationale
- evidence types (direct hypertrophy, longitudinal strength/endurance, EMG, biomechanics/anatomy)
- evidence confidence and explicit limitations
- concise Nerd Fact
- one or more real sources with title, year, PMID/DOI and URL

Do not create a single scientific “best exercise” score directly from EMG. The recommendation engine should combine the target match with user goal, current priority, equipment and practical fit. Evidence confidence should help explain the recommendation, not make an exercise unavailable.

## 12. References reviewed

1. Di Fonza D, et al. *Electromyographic Analysis of Latissimus Dorsi Activation During Common Resistance Training Exercises: A Narrative Review.* J Funct Morphol Kinesiol. 2026. PMID: 42647355. https://pubmed.ncbi.nlm.nih.gov/42647355/ — Recent synthesis of 23 EMG studies across pulldowns, pull-ups, rows and pullovers; useful for activation patterns, not long-term growth rankings.
2. Andersen V, et al. *Effects of grip width on muscle strength and activation in the lat pull-down.* J Strength Cond Res. 2014. PMID: 24662157. https://pubmed.ncbi.nlm.nih.gov/24662157/ — 15 men; no significant lat EMG difference among three tested pronated grip widths; narrow/medium grips permitted slightly higher 6RM loads than wide grip.
3. Snarr RL, et al. *Electromyographical Comparison of a Traditional, Suspension Device, and Towel Pull-Up.* J Hum Kinet. 2017. PMID: 28828073. https://pubmed.ncbi.nlm.nih.gov/28828073/ — 15 resistance-trained adults; no significant LD EMG difference between tested pull-up variants.
4. Fenwick CMJ, Brown SHM, McGill SM. *Comparison of different rowing exercises: trunk muscle activation and lumbar spine motion, load, and stiffness.* J Strength Cond Res. 2009. PMID: 19197209. https://pubmed.ncbi.nlm.nih.gov/19197209/ — 7 men; compared inverted row, bent-over row and one-arm cable row; useful for acute activation and trunk-loading differences, not hypertrophy.
5. Ekstrom RA, Donatelli RA, Soderberg GL. *Surface electromyographic analysis of exercises for the trapezius and serratus anterior muscles.* J Orthop Sports Phys Ther. 2003. PMID: 12774999. https://pubmed.ncbi.nlm.nih.gov/12774999/ — 30 adults; unilateral shrug had the greatest upper-trap EMG of tested movements; prone overhead arm raise had highest lower-trap EMG.
6. Arlotta M, Lovasco G, McLean L. *Selective recruitment of the lower fibers of the trapezius muscle.* J Electromyogr Kinesiol. 2011. PMID: 21144767. https://pubmed.ncbi.nlm.nih.gov/21144767/ — 18 healthy adults; compared five exercises using acute EMG; prone row and modified prone cobra performed well for lower-trap targeting.
7. *Shoulder Retractor Strengthening Exercise to Minimize Rhomboid Muscle Activity and Subacromial Impingement.* PMID: 27504044. https://pubmed.ncbi.nlm.nih.gov/27504044/ — 12 participants and fine-wire EMG; positions altered relative middle-trap/rhomboid activation; does not establish long-term growth differences.
8. Mayer JM, et al. *Effect of Roman chair exercise training on the development of lumbar extension strength.* J Strength Cond Res. 2003. PMID: 12741878. https://pubmed.ncbi.nlm.nih.gov/12741878/ — 12-week small trial; did not find a statistically significant improvement in peak isometric lumbar extension torque versus control.
9. Verna JL, et al. *Back extension endurance and strength: the effect of variable-angle roman chair exercise training.* Spine. 2002. PMID: 12195070. https://pubmed.ncbi.nlm.nih.gov/12195070/ — 8-week RCT; back-extension endurance improved, but measured isometric strength did not significantly increase.
10. Currier BS, et al. *American College of Sports Medicine Position Stand: Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews.* Med Sci Sports Exerc. 2026. PMID: 41843416. https://pubmed.ncbi.nlm.nih.gov/41843416/ — Broad programming evidence from 137 systematic reviews and more than 30,000 participants; not exercise-specific to the back.
11. Kassiano W, et al. *Does Varying Resistance Exercises Promote Superior Muscle Hypertrophy and Strength Gains? A Systematic Review.* J Strength Cond Res. 2022. PMID: 35438660. https://pubmed.ncbi.nlm.nih.gov/35438660/ — Eight studies, 241 participants; supports systematic rather than excessive/random exercise variation.
12. Varovic D, et al. *Does Muscle Length Influence Regional Hypertrophy? A Systematic Review and Meta-Analysis.* Int J Sports Med. 2025. PMID: 40570881. https://pubmed.ncbi.nlm.nih.gov/40570881/ — 12 studies; average regional hypertrophy differences between tested length conditions were generally trivial; not a lat-specific study.

## 13. Implementation guardrails

1. Inspect the existing library and reuse existing exercise IDs/names when they match; do not duplicate records.
2. Never replace the user's personal split, workout history, account state or Firebase data model to import this research.
3. Keep the UI simple and do not render evidence-tier labels or research jargon on exercise cards.
4. Show short Nerd Facts, with clickable source links available inside the Nerd Fact modal.
5. User goal and physique priority change recommendation order, not eligibility.
6. Any valid exercise remains selectable even if it receives a lower recommendation.
7. Keep “upper-lat/lower-lat” as cautious emphasis notes only, never guaranteed isolated-muscle claims.
8. Treat EMG as acute activation evidence, not proof of greater hypertrophy.
9. Do not create fake citations, DOIs, exercises, or numeric claims.
10. Before moving to Chest, test Back recommendations under at least Muscle Gain/Aesthetic/Lats, Muscle Gain/Upper Back, Strength/Back, and a different physique priority; confirm ranking changes but eligibility does not unless equipment/mode/body-part constraints change.
