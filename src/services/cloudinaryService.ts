/**
 * Cloudinary Image Upload Service
 * Cloud Name: de1osc5cg
 * Upload Preset: my-first-lens
 */

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export const CLOUDINARY_CONFIG = {
  cloudName: 'de1osc5cg',
  uploadPreset: 'my-first-lens',
  uploadUrl: 'https://api.cloudinary.com/v1_1/de1osc5cg/image/upload'
};

/**
 * Upload an image file to Cloudinary using unsigned upload preset
 */
export async function uploadImageToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  if (!file) {
    throw new Error('Vui lòng chọn file hình ảnh hợp lệ.');
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Định dạng ảnh không được hỗ trợ. Vui lòng chọn file JPEG, PNG, WEBP, GIF hoặc SVG.');
  }

  // Validate size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Dung lượng ảnh vượt quá giới hạn 10MB. Vui lòng giảm kích thước ảnh.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

  try {
    const response = await fetch(CLOUDINARY_CONFIG.uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const errMsg = errJson?.error?.message || `Lỗi tải ảnh lên Cloudinary (Mã lỗi: ${response.status})`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    return {
      url: data.url,
      secureUrl: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes
    };
  } catch (error: any) {
    console.error('[Cloudinary] Upload failed:', error);
    throw new Error(error.message || 'Không thể kết nối đến máy chủ Cloudinary để tải ảnh lên.');
  }
}
