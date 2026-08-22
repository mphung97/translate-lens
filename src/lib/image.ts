export async function rgbaToPng(
  rgba: Uint8Array,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(rgba), width, height),
    0,
    0,
  );
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png"),
  );
  return new Uint8Array(await blob.arrayBuffer());
}
