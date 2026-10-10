import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Exercise from '../models/Exercise';

// Load server environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface SourceExercise {
  id: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles?: string[];
  muscleAreaEmphasis?: string[];
  equipment?: string;
  exerciseType?: string;
  difficulty?: string;
  instructions?: string[] | string;
  imageUrl?: string;
  tags?: string[];
  isCustom?: boolean;
  imageEnd?: string;
  description?: string;
}

interface MigrationReport {
  totalSourceRecords: number;
  validRecords: number;
  invalidRecords: number;
  matchedImages: number;
  unmatchedImages: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  duplicatesInSource: number;
}

export const runMigration = async (options: { dryRun?: boolean; sampleSize?: number } = {}) => {
  const { dryRun = false, sampleSize } = options;

  console.log('='.repeat(60));
  console.log(`🏋️ GYMTRACKER EXERCISE MIGRATION ${dryRun ? '(DRY RUN / SAMPLE MODE)' : '(FULL IMPORT)'}`);
  console.log('='.repeat(60));

  // 1. Locate Source Data & Images
  const dataPath = path.resolve(__dirname, '../../../client/src/data/exercisesData.json');
  const publicDir = path.resolve(__dirname, '../../../client/public');
  const exercisesImgDir = path.resolve(publicDir, 'exercises');

  console.log(`📁 Source JSON: ${dataPath}`);
  console.log(`📁 Exercise Images Directory: ${exercisesImgDir}`);

  if (!fs.existsSync(dataPath)) {
    throw new Error(`Source exercises data file not found at: ${dataPath}`);
  }

  if (!fs.existsSync(exercisesImgDir)) {
    throw new Error(`Exercise images directory not found at: ${exercisesImgDir}`);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const sourceExercises: SourceExercise[] = JSON.parse(rawData);
  console.log(`📋 Total exercises found in source file: ${sourceExercises.length}`);

  // 2. Connect to MongoDB (optional for local JSON dryRun validation)
  const mongoUri = process.env.MONGODB_URI;
  let isDbConnected = false;

  if (mongoUri && mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      isDbConnected = true;
      console.log('✅ Connected to MongoDB Atlas successfully');
    } catch (err: any) {
      if (dryRun) {
        console.warn(`⚠️ MongoDB connection warning in dry-run mode: ${err.message}`);
        console.warn('   Proceeding with offline source JSON schema & image asset validation...');
      } else {
        throw err;
      }
    }
  } else if (mongoose.connection.readyState !== 0) {
    isDbConnected = true;
  }

  // 3. Process & Map Records
  const seenNames = new Set<string>();
  const report: MigrationReport = {
    totalSourceRecords: sourceExercises.length,
    validRecords: 0,
    invalidRecords: 0,
    matchedImages: 0,
    unmatchedImages: 0,
    insertedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    duplicatesInSource: 0
  };

  const processedList: Array<{
    doc: {
      name: string;
      muscleGroup: string;
      equipment?: string;
      category?: string;
      description?: string;
      instructions?: string;
      imageUrl?: string;
      isCustom: boolean;
    };
    imageExists: boolean;
    sourceId: string;
  }> = [];

  for (const item of sourceExercises) {
    if (!item.name || !item.primaryMuscle) {
      report.invalidRecords++;
      continue;
    }

    const trimmedName = item.name.trim();
    if (seenNames.has(trimmedName.toLowerCase())) {
      report.duplicatesInSource++;
      continue;
    }
    seenNames.add(trimmedName.toLowerCase());

    // Check image existence on file system
    let imageExists = false;
    let finalImageUrl: string | undefined = undefined;

    if (item.imageUrl) {
      finalImageUrl = item.imageUrl.trim();
      const relativePath = finalImageUrl.startsWith('/') ? finalImageUrl.slice(1) : finalImageUrl;
      const fullImagePath = path.resolve(publicDir, relativePath);

      if (fs.existsSync(fullImagePath)) {
        imageExists = true;
        report.matchedImages++;
      } else {
        report.unmatchedImages++;
        console.warn(`⚠️ Image file missing for "${trimmedName}": ${fullImagePath}`);
      }
    }

    // Format instructions cleanly
    let instructionsStr: string | undefined = undefined;
    if (Array.isArray(item.instructions) && item.instructions.length > 0) {
      instructionsStr = item.instructions.join('\n');
    } else if (typeof item.instructions === 'string' && item.instructions.trim()) {
      instructionsStr = item.instructions.trim();
    }

    const doc = {
      name: trimmedName,
      muscleGroup: item.primaryMuscle.trim(),
      equipment: item.equipment ? item.equipment.trim() : undefined,
      category: item.exerciseType ? item.exerciseType.trim() : undefined,
      description: item.description ? item.description.trim() : undefined,
      instructions: instructionsStr,
      imageUrl: finalImageUrl,
      isCustom: item.isCustom ?? false
    };

    report.validRecords++;
    processedList.push({ doc, imageExists, sourceId: item.id });
  }

  // 4. Sample Demonstration (if requested or sample size specified)
  const itemsToProcess = sampleSize ? processedList.slice(0, sampleSize) : processedList;

  if (dryRun || sampleSize) {
    console.log('\n--- SAMPLE MAPPED RECORDS (FIRST 10) ---');
    const sample = itemsToProcess.slice(0, 10);
    sample.forEach((s, idx) => {
      console.log(`\n[${idx + 1}] Exercise: "${s.doc.name}"`);
      console.log(`    Muscle Group : ${s.doc.muscleGroup}`);
      console.log(`    Equipment    : ${s.doc.equipment || 'N/A'}`);
      console.log(`    Category     : ${s.doc.category || 'N/A'}`);
      console.log(`    Image URL    : ${s.doc.imageUrl || 'N/A'} (File exists on disk: ${s.imageExists ? 'YES ✅' : 'NO ❌'})`);
      console.log(`    Instructions : ${s.doc.instructions ? s.doc.instructions.slice(0, 80) + '...' : 'N/A'}`);
      console.log(`    isCustom     : ${s.doc.isCustom}`);
    });
  }

  // 5. Execute Migration in MongoDB (or simulate in dryRun)
  if (dryRun) {
    if (isDbConnected) {
      const existingDocs = await Exercise.find({ isCustom: { $ne: true } }).lean();
      const existingMap = new Map(existingDocs.map((d: any) => [d.name.toLowerCase(), d]));
      console.log(`\n🔍 Performing Dry Run comparison against MongoDB (${existingDocs.length} existing built-in records found in DB)...`);
      itemsToProcess.forEach(({ doc }) => {
        const existing = existingMap.get(doc.name.toLowerCase());
        if (!existing) {
          report.insertedCount++;
        } else {
          const isDifferent =
            existing.muscleGroup !== doc.muscleGroup ||
            existing.equipment !== doc.equipment ||
            existing.category !== doc.category ||
            existing.description !== doc.description ||
            existing.instructions !== doc.instructions ||
            existing.imageUrl !== doc.imageUrl;
          if (isDifferent) {
            report.updatedCount++;
          } else {
            report.skippedCount++;
          }
        }
      });
      console.log('✅ Dry Run calculation completed (NO database writes performed).');
    } else {
      console.log('\n🔍 Dry Run mode (Offline JSON schema validation mode)...');
      report.insertedCount = itemsToProcess.length;
      report.updatedCount = 0;
      report.skippedCount = 0;
      console.log('✅ Dry Run JSON schema validation completed (NO database writes performed).');
    }
  } else {
    console.log(`\n🚀 Executing import of ${itemsToProcess.length} exercises into MongoDB...`);

    // Use bulkWrite with upsert on unique exercise name & isCustom: false to prevent overwriting custom exercises
    const bulkOps = itemsToProcess.map(({ doc }) => ({
      updateOne: {
        filter: { name: doc.name, isCustom: { $ne: true } },
        update: { $set: doc },
        upsert: true
      }
    }));

    const result = await Exercise.bulkWrite(bulkOps, { ordered: false });

    report.insertedCount = result.upsertedCount;
    report.updatedCount = result.modifiedCount;
    report.skippedCount = (result.matchedCount || 0) - (result.modifiedCount || 0);

    console.log('✅ MongoDB bulkWrite completed successfully.');
  }

  // 6. Query Total Documents in Database
  const totalInDb = isDbConnected ? await Exercise.countDocuments() : 'N/A (Offline Dry Run)';

  console.log('\n' + '='.repeat(60));
  console.log(`📊 MIGRATION SUMMARY REPORT ${dryRun ? '(DRY RUN PREVIEW)' : ''}`);
  console.log('='.repeat(60));
  console.log(`Total Source Records Found       : ${report.totalSourceRecords}`);
  console.log(`Valid Records Mapped             : ${report.validRecords}`);
  console.log(`Duplicates in Source Skipped     : ${report.duplicatesInSource}`);
  console.log(`Invalid Records                  : ${report.invalidRecords}`);
  console.log(`Image Files Matched on Disk      : ${report.matchedImages}`);
  console.log(`Image Files Unmatched on Disk    : ${report.unmatchedImages}`);
  console.log(`New Exercises To Insert (DB)     : ${report.insertedCount}`);
  console.log(`Existing Exercises To Update (DB): ${report.updatedCount}`);
  console.log(`Existing Exercises Unchanged (DB): ${report.skippedCount}`);
  console.log(`Total Exercise Documents in DB   : ${totalInDb}`);
  console.log('='.repeat(60) + '\n');

  return { report, totalInDb };
};

// If executed directly from command line
if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  const sampleArg = process.argv.find(arg => arg.startsWith('--sample='));
  const sampleSize = sampleArg ? parseInt(sampleArg.split('=')[1], 10) : undefined;

  runMigration({ dryRun: isDryRun, sampleSize })
    .then(async () => {
      await mongoose.disconnect();
      console.log('👋 MongoDB connection closed.');
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Migration failed:', err);
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      process.exit(1);
    });
}
