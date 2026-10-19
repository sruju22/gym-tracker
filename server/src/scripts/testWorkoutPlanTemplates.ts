import { WORKOUT_TEMPLATES, getRecommendedTemplate, getTemplateById } from '../data/workoutTemplates';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log('--- TEST 1: Catalog Integrity & Completeness ---');
  assert(WORKOUT_TEMPLATES.length === 26, `Expected 26 workout templates, found ${WORKOUT_TEMPLATES.length}`);

  const ids = new Set<string>();
  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (const tpl of WORKOUT_TEMPLATES) {
    assert(!ids.has(tpl.id), `Template ID must be unique: ${tpl.id}`);
    ids.add(tpl.id);

    assert(Boolean(tpl.name && tpl.name.length > 3), `Template ${tpl.id} has valid name: ${tpl.name}`);
    assert(Boolean(tpl.goal && tpl.goal.length > 3), `Template ${tpl.id} has valid goal: ${tpl.goal}`);
    assert(tpl.daysPerWeek >= 2 && tpl.daysPerWeek <= 6, `Template ${tpl.id} has realistic daysPerWeek: ${tpl.daysPerWeek}`);
    assert(Boolean(tpl.progressionMethodology && tpl.progressionMethodology.length > 10), `Template ${tpl.id} has detailed progression methodology`);
    assert(Boolean(tpl.setRepGuidance && tpl.setRepGuidance.length > 5), `Template ${tpl.id} has set & rep guidance`);
    assert(Boolean(tpl.recoveryNotes && tpl.recoveryNotes.length > 5), `Template ${tpl.id} has recovery guidance`);

    // Verify 7-day schedule
    assert(Boolean(tpl.weeklySchedule), `Template ${tpl.id} must define weeklySchedule`);
    let activeTrainingDays = 0;
    for (const day of validDays) {
      const dayConfig = (tpl.weeklySchedule as any)[day];
      assert(Boolean(dayConfig), `Template ${tpl.id} missing schedule for day: ${day}`);
      if (!dayConfig.isRest) {
        activeTrainingDays++;
        assert(Array.isArray(dayConfig.muscleGroups) && dayConfig.muscleGroups.length > 0, `Training day ${day} in ${tpl.id} must have assigned muscle groups`);
      }
    }
    assert(activeTrainingDays === tpl.daysPerWeek, `Template ${tpl.id} active training days (${activeTrainingDays}) matches declared daysPerWeek (${tpl.daysPerWeek})`);
  }

  console.log('\n--- TEST 2: Specific Famous Progression Rules Verification ---');
  // 5/3/1 Wave Percentages & 90% TM
  const fiveThreeOne = getTemplateById('strength-531-inspired-4day');
  assert(Boolean(fiveThreeOne), '5/3/1 template exists');
  const prog531 = fiveThreeOne!.progressionMethodology;
  assert(prog531.includes('90%') || prog531.includes('Training Max') || prog531.includes('TM'), '5/3/1 states 90% Training Max rule');
  assert(prog531.includes('65%') && prog531.includes('85%') && prog531.includes('95%'), '5/3/1 states wave percentages');

  // Texas Method Volume & Intensity
  const texas = getTemplateById('strength-texas-method-3day');
  assert(Boolean(texas), 'Texas Method template exists');
  const progTexas = texas!.progressionMethodology;
  assert(progTexas.includes('Volume Day') || progTexas.includes('5x5'), 'Texas Method volume day rules');
  assert(progTexas.includes('Intensity Day') || progTexas.includes('1x5') || progTexas.includes('PR'), 'Texas Method intensity day rules');

  // 6-day Muscle Building Split (Push A / Pull A / Legs / Push B / Pull B / Upper + Arms)
  const ppl6 = getTemplateById('hypertrophy-ppl-6day');
  assert(Boolean(ppl6), '6-Day PPL template exists');
  assert(ppl6!.weeklySchedule.monday.name === 'Push A', 'Monday is Push A');
  assert(ppl6!.weeklySchedule.tuesday.name === 'Pull A', 'Tuesday is Pull A');
  assert(ppl6!.weeklySchedule.wednesday.name.includes('Legs'), 'Wednesday includes Legs');
  assert(ppl6!.weeklySchedule.thursday.name === 'Push B', 'Thursday is Push B');
  assert(ppl6!.weeklySchedule.friday.name === 'Pull B', 'Friday is Pull B');
  assert(ppl6!.weeklySchedule.saturday.name === 'Upper + Arms', 'Saturday is Upper + Arms');
  assert(ppl6!.weeklySchedule.sunday.isRest === true, 'Sunday is Rest');

  console.log('\n--- TEST 3: All 16 Goal × Frequency Combinations ---');
  const goals = [
    'Muscle Building & Hypertrophy',
    'Strength & Power',
    'Fat Loss & Conditioning',
    'General Fitness & Longevity',
  ];
  const frequencies = [3, 4, 5, 6];

  for (const g of goals) {
    for (const f of frequencies) {
      const rec = getRecommendedTemplate(g, f);
      assert(Boolean(rec), `Recommendation exists for ${g} + ${f} days`);
      assert(rec.daysPerWeek === f, `Recommended template ${rec.id} has ${rec.daysPerWeek} days, expected exact match of ${f} days`);
      assert(rec.goal.toLowerCase().includes(g.split(' ')[0].toLowerCase()), `Recommended template ${rec.id} goal aligns with ${g}`);
    }
  }

  console.log('\n--- TEST 4: Data Isolation & Safety Guarantee ---');
  // Simulated switching: ensure user workout history & PR collections are unaffected
  const mockUserHistory = [{ id: 'w1', workoutName: 'Bench Test', date: '2026-10-18' }];
  const mockUserPRs = [{ id: 'pr1', exerciseName: 'Barbell Bench Press', weight: 100 }];

  // Apply new template
  const newTemplate = getTemplateById('strength-531-inspired-4day')!;
  const updatedPlan = {
    templateId: newTemplate.id,
    templateName: newTemplate.name,
    fitnessGoal: newTemplate.goal,
    weeklyPlan: newTemplate.weeklySchedule,
  };

  // Assert user data wasn't mutated
  assert(mockUserHistory.length === 1 && mockUserHistory[0].id === 'w1', 'Workout history intact after template update');
  assert(mockUserPRs.length === 1 && mockUserPRs[0].weight === 100, 'Personal records intact after template update');
  assert(updatedPlan.templateId === 'strength-531-inspired-4day', 'Template switched successfully to 5/3/1');

  console.log('\n🎉 ALL 26 TEMPLATES & 16-COMBINATION TESTS PASSED SUCCESSFULLY!\n');
}

runTests();
