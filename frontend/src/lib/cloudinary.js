const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export function openCloudinaryWidget(onSuccess) {
  if (!window.cloudinary || !CLOUDINARY_CLOUD_NAME) {
    console.warn('Cloudinary widget not available or not configured');
    return;
  }
  const widget = window.cloudinary.createUploadWidget(
    {
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
      sources: ['local', 'url', 'camera'],
      multiple: true,
      maxFiles: 10,
      maxFileSize: 5000000,
      folder: 'bg-store',
    },
    (error, result) => {
      if (!error && result.event === 'success') {
        onSuccess(result.info.secure_url);
      }
    },
  );
  widget.open();
}