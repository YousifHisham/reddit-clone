const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dgzptwfyz',
  api_key: process.env.CLOUDINARY_API_KEY || '192694623597297',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'R8Q15Q0rQ8XIeF9',
});

const createCloudinaryStorage = (folder, options = {}) => ({
  _handleFile(req, file, cb) {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, ...options },
      (error, result) => {
        if (error) return cb(error);
        cb(null, { path: result.secure_url, filename: result.public_id });
      }
    );
    Readable.from(file.stream).pipe(uploadStream);
  },
  _removeFile(_req, file, cb) {
    cloudinary.uploader.destroy(file.filename, cb);
  },
});

const uploadProfile = multer({ storage: createCloudinaryStorage('reddit-clone/profiles', { width: 256, height: 256, crop: 'fill' }), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadPost = multer({ storage: createCloudinaryStorage('reddit-clone/posts'), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadCommunity = multer({ storage: createCloudinaryStorage('reddit-clone/communities'), limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = { cloudinary, uploadProfile, uploadPost, uploadCommunity };
