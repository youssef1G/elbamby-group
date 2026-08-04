const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadImages(fileList, onProgress) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.');
  }

  const files = Array.from(fileList);
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  let doneBytes = 0;

  const urls = await Promise.all(
    files.map((file) =>
      uploadOne(file, (loaded) => {
        if (onProgress) {
          onProgress(Math.min(100, Math.round(((doneBytes + loaded) / totalBytes) * 100)));
        }
      }).then((url) => {
        doneBytes += file.size;
        return url;
      })
    )
  );
  return urls;
}

function uploadOne(file, onFileProgress) {
  if (file.size > 10 * 1024 * 1024) {
    return Promise.reject(new Error(`${file.name} must be under 10 MB`));
  }
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onFileProgress(e.loaded);
    });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText).secure_url);
        } catch {
          reject(new Error('Image upload failed'));
        }
      } else {
        reject(new Error('Image upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Image upload failed'));
    xhr.send(fd);
  });
}
