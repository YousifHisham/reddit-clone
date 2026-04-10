const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'reddit-clone/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 256, height: 256, crop: 'fill' }],
  },
});

const postStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'reddit-clone/posts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov'],
  },
});

const communityStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'reddit-clone/communities',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const uploadProfile = multer({ storage: profileStorage });
const uploadPost = multer({ storage: postStorage });
const uploadCommunity = multer({ storage: communityStorage });

module.exports = { cloudinary, uploadProfile, uploadPost, uploadCommunity };
