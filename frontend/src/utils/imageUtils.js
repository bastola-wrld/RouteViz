// Utility functions for image processing and history management

export const validateImageFile = (file) => {
  const validTypes = ['image/jpeg', 'image/png'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG and PNG images are supported' };
  }
  if (file.size > 10 * 1024 * 1024) { // 10MB
    return { valid: false, error: 'Image size must be under 10MB' };
  }
  return { valid: true, error: null };
};

export const resizeImageIfNeeded = (file, maxDimension = 1024) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (img.width <= maxDimension && img.height <= maxDimension) {
          resolve(file);
          return;
        }

        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: file.type }));
        }, file.type);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const saveToHistory = (result) => {
  const history = JSON.parse(sessionStorage.getItem('rv_history') || '[]');
  const entry = {
    ...result,
    timestamp: new Date().toISOString(),
    id: Math.random().toString(36).substr(2, 9)
  };
  const newHistory = [entry, ...history].slice(0, 10);
  sessionStorage.setItem('rv_history', JSON.stringify(newHistory));
  return newHistory;
};

export const loadHistory = () => {
  return JSON.parse(sessionStorage.getItem('rv_history') || '[]');
};
