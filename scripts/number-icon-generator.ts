import { writeFileSync } from "fs";
import path from "path";

function makeSvg(i: number, col: string) {
  const w = 24;
  const h = 16;
  const y = 10;
  return `
  <?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}pt" height="${h}pt" viewBox="0 0 ${w} ${h}" version="1.1">
    <text x="1pt" y="${y}pt" font-weight="bold" fill="${col}">${i}</text>
  </svg>
`.trim();
}

/**
 * @returns {number} An HSL hue (angle) for any input value from 0 (green = 120) to 1 (red = 0).
 */
function makeHeatHue(heat: number, mapMin = 120, mapMax = 0) {
  if (heat < 0 || heat > 1) {
    throw new Error(`invalid value must be between 0 and 1: ${heat}`);
  }

  const norm = mapMax - mapMin;
  return mapMin + (heat * norm);
}

function makeHsl(heat: number) {
  const h = makeHeatHue(heat);
  return `hsl(${h}, 55%, 55%)`;
}


(async function main() {
  const dir = path.join(__dirname, "../resources/dark/num");
  const min = 0;
  const max = 10;
  
  const heatUnit = 1 / (max - min);
  for (let i = 1; i <= 10; ++i) {
    const color = makeHsl(i * heatUnit);
    const svg = makeSvg(i, color);
    writeFileSync(path.join(dir, i + "") + ".svg", svg);
  }
})();

