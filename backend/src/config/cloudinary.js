const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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

const uploadProfile = multer({ storage: createCloudinaryStorage('reddit-clone/profiles', { width: 256, height: 256, crop: 'fill' }) });
const uploadPost = multer({ storage: createCloudinaryStorage('reddit-clone/posts') });
const uploadCommunity = multer({ storage: createCloudinaryStorage('reddit-clone/communities') });

module.exports = { cloudinary, uploadProfile, uploadPost, uploadCommunity };
