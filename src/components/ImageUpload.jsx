import { useState, useCallback, useRef } from 'react';
import { Button } from './ui';

/**
 * Image Upload Component with compression and validation
 * Features:
 * - Client-side compression before upload
 * - File type validation
 * - Size validation
 * - Multiple file support
 * - Preview thumbnails
 */
export default function ImageUpload({
  onUpload,
  maxFiles = 10,
  maxSizeMB = 10,
  accept = 'image/jpeg,image/png,image/webp',
  compressionQuality = 0.8,
  currentImages = [],
}) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const compressImage = useCallback(async (file, quality = compressionQuality) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1920;
          
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            quality
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }, [compressionQuality]);

  const validateFile = (file) => {
    const errors = [];
    
    // Type validation
    const validTypes = accept.split(',').map(t => t.trim());
    if (!validTypes.some(type => file.type === type || file.type.match(type.replace('*', '.*')))) {
      errors.push(`Invalid file type: ${file.type}`);
    }
    
    // Size validation
    if (file.size > maxSizeMB * 1024 * 1024) {
      errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max ${maxSizeMB}MB)`);
    }
    
    return errors;
  };

  const handleFiles = useCallback(async (selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    const remainingSlots = maxFiles - currentImages.length - files.length;
    
    if (remainingSlots <= 0) {
      alert(`Maximum ${maxFiles} images allowed`);
      return;
    }
    
    const validFiles = [];
    for (const file of fileArray.slice(0, remainingSlots)) {
      const errors = validateFile(file);
      if (errors.length === 0) {
        validFiles.push(file);
      } else {
        console.warn('Skipping invalid file:', errors.join(', '));
      }
    }
    
    // Create previews
    const newFiles = await Promise.all(validFiles.map(async (file) => {
      const compressed = await compressImage(file);
      const preview = URL.createObjectURL(compressed);
      return {
        id: Math.random().toString(36).substr(2, 9),
        original: file,
        compressed,
        preview,
        name: file.name,
        size: compressed.size,
      };
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, [maxFiles, currentImages.length, files.length, maxSizeMB, accept, compressImage]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleRemove = (fileId) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file.compressed, file.name);
        
        // In production, this would upload to your backend/Cloudinary
        // const response = await fetch('/api/upload', { method: 'POST', body: formData });
        // const data = await response.json();
        // uploadedUrls.push(data.url);
        
        // For demo, simulate upload
        uploadedUrls.push(file.preview);
      }
      
      onUpload?.(uploadedUrls);
      setFiles([]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const totalImages = currentImages.length + files.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--blue-500)' : 'var(--border)'}`,
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Drop images here or click to upload
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          JPEG, PNG, WebP up to {maxSizeMB}MB each · {totalImages}/{maxFiles} images
        </div>
      </div>

      {/* Preview grid */}
      {(files.length > 0 || currentImages.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
          {currentImages.map((img, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
          {files.map((file) => (
            <div key={file.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img src={file.preview} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={() => handleRemove(file.id)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.6)',
                fontSize: 9,
                color: '#fff',
              }}>
                {(file.size / 1024).toFixed(0)}KB
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && (
        <Button
          variant="primary"
          onClick={handleUpload}
          loading={uploading}
          style={{ alignSelf: 'flex-start' }}
        >
          Upload {files.length} Image{files.length > 1 ? 's' : ''}
        </Button>
      )}
    </div>
  );
}
