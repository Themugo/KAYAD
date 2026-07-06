import api from "../api/api";

const FOLDERS = [
  "vehicles", "dealers", "profiles", "inspection",
  "auction", "escrow", "documents", "receipts",
  "marketing", "chat", "temp",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/avif"],
  video: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
  document: [
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "text/csv", "application/json",
  ],
};

const QUEUE_KEY = "kayad_upload_queue";

const compressImage = (file, { maxWidth = 1920, maxHeight = 1920, quality = 0.82 } = {}) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return resolve(file);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
      if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          const compressed = new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() });
          resolve(compressed);
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
};

const validate = (file, options = {}) => {
  const { maxSize = MAX_FILE_SIZE, allowedTypes } = options;

  if (file.size > maxSize) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${(maxSize / 1024 / 1024).toFixed(0)}MB.`);
  }

  if (allowedTypes && allowedTypes.length > 0) {
    const category = Object.entries(ALLOWED_TYPES).find(([, types]) => types.includes(file.type));
    if (!allowedTypes.includes(file.type) && !allowedTypes.some((t) => file.type.startsWith(t))) {
      throw new Error(`File type ${file.type} is not allowed.`);
    }
    if (!category && !file.type.startsWith("image/")) {
      // allow any image type if it starts with image/
    }
  }
};

const uploadFile = async (file, folder = "temp", options = {}) => {
  const { compress = true, onProgress, maxSize, allowedTypes } = options;

  validate(file, { maxSize, allowedTypes });

  let processed = file;
  if (compress && file.type.startsWith("image/")) {
    processed = await compressImage(file);
  }

  const fd = new FormData();
  fd.append("file", processed);
  fd.append("folder", folder);

  const { data } = await api.post("/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (e) => onProgress(e.loaded, e.total)
      : undefined,
  });

  return data;
};

const uploadMultiple = async (files, folder = "temp", options = {}) => {
  const { compress = true, onProgress, maxSize, allowedTypes } = options;

  const validated = await Promise.all(
    files.map(async (file) => {
      validate(file, { maxSize, allowedTypes });
      if (compress && file.type.startsWith("image/")) {
        return compressImage(file);
      }
      return file;
    }),
  );

  const fd = new FormData();
  validated.forEach((f) => fd.append("files", f));
  fd.append("folder", folder);

  const { data } = await api.post("/upload/multiple", fd, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (e) => onProgress(e.loaded, e.total)
      : undefined,
  });

  return data;
};

const deleteFile = async (publicId) => {
  const { data } = await api.delete(`/upload/${publicId}`);
  return data;
};

const revokeObjectURL = (url) => {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

const createObjectURL = (file) => {
  return URL.createObjectURL(file);
};

const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveOfflineQueue = (queue) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // storage full - discard oldest
  }
};

const addToOfflineQueue = (file, folder, options = {}) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const queue = getOfflineQueue();
      queue.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        fileData: e.target.result,
        fileName: file.name,
        fileType: file.type,
        folder,
        options,
        createdAt: Date.now(),
        retries: 0,
      });
      saveOfflineQueue(queue);
      resolve(queue.length);
    };
    reader.onerror = () => resolve(-1);
    reader.readAsDataURL(file);
  });
};

const processOfflineQueue = async (onItemComplete) => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    try {
      const response = await fetch(item.fileData);
      const blob = await response.blob();
      const file = new File([blob], item.fileName, { type: item.fileType });

      const result = await uploadFile(file, item.folder, item.options);
      if (onItemComplete) onItemComplete({ success: true, item, result });
    } catch {
      item.retries += 1;
      if (item.retries < 5) {
        remaining.push(item);
      }
      if (onItemComplete) onItemComplete({ success: false, item });
    }
  }
  saveOfflineQueue(remaining);
  return remaining.length;
};

export {
  FOLDERS,
  uploadFile,
  uploadMultiple,
  deleteFile,
  revokeObjectURL,
  createObjectURL,
  compressImage,
  validate,
  addToOfflineQueue,
  processOfflineQueue,
  getOfflineQueue,
};
