type RGB = [number, number, number];

type ColorMap = {
  palette: () => RGB[];
};

declare function quantize(pixels: RGB[], maximumColors: number): ColorMap | null;

export default quantize;
