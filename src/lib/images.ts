export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("imagen"));
    img.src = src;
  });
}

export async function fileToCanvas(file: File, max = 960): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      bitmap = await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("lienzo");
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.86,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("vacio"));
    }, type, quality);
  });
}

export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
