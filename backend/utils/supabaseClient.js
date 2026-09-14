// utils/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

let rawUrl = process.env.SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in environment variables.');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');
const BUCKET_NAME = 'campusconnect-uploads';

let bucketChecked = false;

/**
 * Ensures the public bucket exists in Supabase Storage.
 */
async function ensureBucketExists() {
  if (bucketChecked) return;
  try {
    const { data: bucket, error } = await supabase.storage.getBucket(BUCKET_NAME);
    if (error || !bucket) {
      console.log(`Bucket "${BUCKET_NAME}" not found. Creating public bucket...`);
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 25 * 1024 * 1024, // 25MB limit
      });
      if (createError) {
        console.error('Error creating Supabase bucket:', createError.message);
      } else {
        console.log(`Bucket "${BUCKET_NAME}" created successfully.`);
      }
    }
    bucketChecked = true;
  } catch (err) {
    console.error('Failed to verify Supabase storage bucket:', err.message);
  }
}

/**
 * Uploads a file buffer to Supabase Storage.
 * @param {Buffer} fileBuffer - The file content buffer
 * @param {string} originalName - Original file name
 * @param {string} mimeType - File MIME type
 * @param {string} folder - Target folder inside bucket (default: 'notes')
 * @returns {Promise<{ fileUrl: string, filePath: string }>}
 */
async function uploadToSupabase(fileBuffer, originalName, mimeType, folder = 'notes') {
  await ensureBucketExists();

  const ext = path.extname(originalName);
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const filePath = `${folder}/${uniqueName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: true,
    });

  if (error) {
    console.error('Supabase storage upload error:', error);
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    fileUrl: urlData.publicUrl,
    filePath,
  };
}

const PRIVATE_BUCKET = 'assignments';

/**
 * Uploads a file buffer to the private assignments bucket.
 * @param {Buffer} fileBuffer
 * @param {string} originalName
 * @param {string} mimeType
 * @param {string} folder
 * @returns {Promise<{ filePath: string, bucket: string }>}
 */
async function uploadToSupabasePrivate(fileBuffer, originalName, mimeType, folder = 'assignments') {
  const ext = path.extname(originalName);
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const filePath = `${folder}/${uniqueName}`;

  const { data, error } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: true,
    });

  if (error) {
    console.error('Supabase private storage upload error:', error);
    throw new Error(`Supabase private upload failed: ${error.message}`);
  }

  return {
    filePath,
    bucket: PRIVATE_BUCKET,
  };
}

/**
 * Generates a temporary Signed URL (1-hour default expiry) for a private file.
 * @param {string} bucketName - Target bucket (default: 'assignments')
 * @param {string} filePath - Path of file in bucket
 * @param {number} expiresInSeconds - Lifetime of URL in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} Signed URL string
 */
async function getSignedUrl(bucketName = PRIVATE_BUCKET, filePath, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    console.error('Supabase createSignedUrl error:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

module.exports = {
  supabase,
  uploadToSupabase,
  uploadToSupabasePrivate,
  getSignedUrl,
  BUCKET_NAME,
  PRIVATE_BUCKET,
};

