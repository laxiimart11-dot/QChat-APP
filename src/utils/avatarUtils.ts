// Avatar utilities and image processing

export function cleanAvatarUrl(url?: string | null, name?: string | null): string {
  if (url && typeof url === 'string') {
    const trimmed = url.trim();
    if (trimmed && !trimmed.includes('bottts') && !trimmed.includes('dicebear')) {
      return trimmed;
    }
  }
  const cleanName = (name || 'User').trim();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=6366f1&color=fff&size=200&bold=true`;
}

/**
 * Compress an image file to a lightweight data URL (JPEG ~256x256)
 * suitable for Firestore and instantaneous loading.
 */
export function compressImageFile(file: File, maxSize = 256, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
