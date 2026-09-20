import {
  OCR_JPEG_FALLBACK_BYTES,
  OCR_JPEG_QUALITY,
  OCR_MAX_LONG_EDGE,
  OCR_SMALL_PNG_CUTOFF,
  OCR_TINY_UPSCALE_CUTOFF,
} from "@/constants";

export interface PreparedImage {
  bytes: Uint8Array;
  mediaType: "image/png" | "image/jpeg";
}

function rgbaToCanvas(
  rgba: Uint8Array,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const clamped = new Uint8ClampedArray(
    rgba.buffer as ArrayBuffer,
    rgba.byteOffset,
    width * height * 4,
  );
  ctx.putImageData(new ImageData(clamped, width, height), 0, 0);
  return canvas;
}

function drawScaled(
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas;
}

async function canvasToBytes(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), type, quality),
  );
  if (!blob) throw new Error("Failed to encode image");
  return new Uint8Array(await blob.arrayBuffer());
}

async function toJpegBytes(
  source: HTMLCanvasElement,
  quality: number,
): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0);
  return canvasToBytes(canvas, "image/jpeg", quality);
}

function scaledToMaxEdge(
  width: number,
  height: number,
  maxEdge: number,
): [number, number] {
  const scale = maxEdge / Math.max(width, height);
  return [Math.round(width * scale), Math.round(height * scale)];
}

export async function rgbaToPng(
  rgba: Uint8Array,
  width: number,
  height: number,
): Promise<Uint8Array> {
  return canvasToBytes(rgbaToCanvas(rgba, width, height), "image/png");
}

/**
 * Encode a decoded image canvas for vision OCR.
 * Small images stay PNG (sharp Hanzi), large images become JPEG.
 */
export async function encodeCanvas(
  source: HTMLCanvasElement,
): Promise<PreparedImage> {
  const width = source.width;
  const height = source.height;
  if (width <= 0 || height <= 0) throw new Error("Invalid image dimensions");
  const longEdge = Math.max(width, height);

  if (longEdge < OCR_TINY_UPSCALE_CUTOFF) {
    const upscaled = drawScaled(source, width * 2, height * 2);
    return {
      bytes: await canvasToBytes(upscaled, "image/png"),
      mediaType: "image/png",
    };
  }

  if (longEdge < OCR_SMALL_PNG_CUTOFF) {
    return {
      bytes: await canvasToBytes(source, "image/png"),
      mediaType: "image/png",
    };
  }

  if (longEdge <= OCR_MAX_LONG_EDGE) {
    const png = await canvasToBytes(source, "image/png");
    if (png.byteLength <= OCR_JPEG_FALLBACK_BYTES) {
      return { bytes: png, mediaType: "image/png" };
    }
    return {
      bytes: await toJpegBytes(source, OCR_JPEG_QUALITY),
      mediaType: "image/jpeg",
    };
  }

  const [tw, th] = scaledToMaxEdge(width, height, OCR_MAX_LONG_EDGE);
  const downscaled = drawScaled(source, tw, th);
  return {
    bytes: await toJpegBytes(downscaled, OCR_JPEG_QUALITY),
    mediaType: "image/jpeg",
  };
}

/**
 * Downscale / re-encode clipboard RGBA for vision OCR.
 * Small images stay PNG (sharp Hanzi), large images become JPEG.
 */
export async function prepareImageForOcr(
  rgba: Uint8Array,
  width: number,
  height: number,
): Promise<PreparedImage> {
  if (width <= 0 || height <= 0) throw new Error("Invalid image dimensions");
  if (rgba.byteLength < width * height * 4) {
    throw new Error("RGBA buffer smaller than dimensions");
  }
  return encodeCanvas(rgbaToCanvas(rgba, width, height));
}

/**
 * Decode an uploaded image file and prepare it for OCR.
 * Shares the encode path with clipboard RGBA via `encodeCanvas`.
 */
export async function prepareFileForOcr(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Not an image file");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    return await encodeCanvas(canvas);
  } finally {
    bitmap.close();
  }
}
