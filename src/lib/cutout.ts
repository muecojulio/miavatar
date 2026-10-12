function colorDist(
  data: Uint8ClampedArray,
  index: number,
  rgb: [number, number, number],
) {
  const dr = data[index] - rgb[0];
  const dg = data[index + 1] - rgb[1];
  const db = data[index + 2] - rgb[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function opaqueRatio(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 1;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let seen = 0;
  let opaque = 0;
  for (let i = 3; i < data.length; i += 16) {
    seen += 1;
    if (data[i] > 24) opaque += 1;
  }
  return seen ? opaque / seen : 0;
}

export function removeBackground(source: CanvasImageSource & { width: number; height: number }) {
  const srcW = "naturalWidth" in source && source.naturalWidth ? source.naturalWidth : source.width;
  const srcH = "naturalHeight" in source && source.naturalHeight ? source.naturalHeight : source.height;
  const canvas = document.createElement("canvas");
  canvas.width = srcW;
  canvas.height = srcH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(source, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = frame;
  const corners: [number, number, number][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const points = [0, width - 1, width * (height - 1), width * height - 1];
  points.forEach((pixel, i) => {
    const index = pixel * 4;
    corners[i] = [data[index], data[index + 1], data[index + 2]];
  });
  const base = corners[0];
  const similar = corners.every(
    (rgb) =>
      Math.abs(rgb[0] - base[0]) + Math.abs(rgb[1] - base[1]) + Math.abs(rgb[2] - base[2]) < 90,
  );
  const bg: [number, number, number] = similar
    ? [
        Math.round(corners.reduce((sum, rgb) => sum + rgb[0], 0) / 4),
        Math.round(corners.reduce((sum, rgb) => sum + rgb[1], 0) / 4),
        Math.round(corners.reduce((sum, rgb) => sum + rgb[2], 0) / 4),
      ]
    : [255, 255, 255];
  const limit = similar ? 46 : 18;
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (seen[pixel]) return;
    const index = pixel * 4;
    const nearWhite = data[index] > 242 && data[index + 1] > 242 && data[index + 2] > 242;
    if (!nearWhite && colorDist(data, index, bg) > limit) return;
    seen[pixel] = 1;
    stack.push(pixel);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const pixel = stack.pop() as number;
    data[pixel * 4 + 3] = 0;
    const x = pixel % width;
    const y = (pixel - x) / width;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  ctx.putImageData(frame, 0, 0);
  return canvas;
}
