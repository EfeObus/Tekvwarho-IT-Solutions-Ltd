/**
 * Document Vault Storage Service
 * Wraps Google Cloud Storage for the compliance document vault. Files are
 * NOT stored on the Cloud Run container's local filesystem - that's
 * ephemeral and would be lost on every redeploy/restart/scale event.
 */

const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');

const BUCKET_NAME = process.env.VAULT_BUCKET || 'tekvwa-document-vault';
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

/**
 * Upload a file buffer to the vault. Returns the storage path (object name).
 */
async function uploadDocument(buffer, originalName, mimeType) {
    const objectName = `${uuidv4()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const file = bucket.file(objectName);
    await file.save(buffer, {
        contentType: mimeType,
        resumable: false
    });
    return objectName;
}

/**
 * Download a file's contents as a Buffer.
 */
async function downloadDocument(storagePath) {
    const file = bucket.file(storagePath);
    const [buffer] = await file.download();
    return buffer;
}

/**
 * Permanently delete a file from the vault.
 */
async function deleteDocument(storagePath) {
    const file = bucket.file(storagePath);
    await file.delete({ ignoreNotFound: true });
}

module.exports = { uploadDocument, downloadDocument, deleteDocument };
