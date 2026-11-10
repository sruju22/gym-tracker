import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import {
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from '../services/cloudinaryService';

async function runTest() {
  console.log('\n=== TESTING CLOUDINARY UPLOAD PIPELINE ===\n');

  console.log('1. Checking configuration...');
  const isConfigured = isCloudinaryConfigured();
  console.log(`   Configured: ${isConfigured ? 'YES ✅' : 'NO ❌'}`);
  if (!isConfigured) {
    console.error('Cloudinary environment variables missing in server/.env');
    process.exit(1);
  }

  // 1x1 transparent PNG pixel buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  console.log('2. Uploading test asset to gymtrackie/avatars...');
  try {
    const result = await uploadBufferToCloudinary(samplePngBuffer, 'avatars', 'test_user');
    console.log('   Upload SUCCESS ✅');
    console.log(`   Secure URL: ${result.url}`);
    console.log(`   Public ID:  ${result.publicId}`);
    console.log(`   Format:     ${result.format}`);
    console.log(`   Size:       ${result.bytes} bytes`);

    console.log('\n3. Cleaning up test asset from Cloudinary...');
    const deleted = await deleteFromCloudinary(result.publicId);
    console.log(`   Deleted:    ${deleted ? 'YES ✅' : 'NO ❌'}`);

    console.log('\n🎉 ALL CLOUDINARY TESTS PASSED! Credentials and upload stream are working.\n');
  } catch (err: any) {
    console.error('❌ Cloudinary upload failed:', err.message || err);
    process.exit(1);
  }
}

runTest();
