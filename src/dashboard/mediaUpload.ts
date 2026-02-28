import { requestJson } from "../api";

interface SignedUploadResponse {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  folder: string;
  signature: string;
}

interface CloudinaryUploadResponse {
  secure_url: string;
}

export async function uploadPostImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const signed = await requestJson<SignedUploadResponse>("/media/sign-upload", {
    method: "POST",
  });

  return new Promise<string>((resolve, reject) => {
    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      signed.cloud_name,
    )}/image/upload`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signed.api_key);
    formData.append("timestamp", String(signed.timestamp));
    formData.append("folder", signed.folder);
    formData.append("signature", signed.signature);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      onProgress(percent);
    };

    xhr.onerror = () => {
      reject(new Error("Image upload failed"));
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error("Image upload failed"));
        return;
      }

      try {
        const payload = JSON.parse(xhr.responseText) as CloudinaryUploadResponse;
        if (!payload.secure_url) {
          reject(new Error("Image upload failed"));
          return;
        }
        resolve(payload.secure_url);
      } catch {
        reject(new Error("Image upload failed"));
      }
    };

    xhr.send(formData);
  });
}
