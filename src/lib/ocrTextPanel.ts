/**
 * Right-side OCR text panel painter.
 *
 * Port of PaddleOCR-JS `viz/ocr/draw-text.ts` (white panel with stroked
 * outlines + fitted text), adapted for Lens:
 * - origin is (0,0): no `offsetX` — this panel stands alone, not next to
 *   the source image;
 * - canvas is sized to the boxes' content bounds (+ padding), not to the
 *   source image dims (Lens doesn't retain image dims post-OCR);
 * - accepts both `{x,y}` and `[x,y]` polys (the SDK returns tuples, Lens
 *   types claim objects — tolerate both).
 *
 * Pure geometry helpers are DOM-free and unit-tested; only
 * `drawTextPanel` / `renderTextPanelToCanvas` touch a 2D context.
 */

export type PanelPoint = { x: number; y: number } | [number, number];

export interface TextPanelBox {
  poly: PanelPoint[];
  text: string;
  score?: number;
}

export type RgbColor = [number, number, number];

export interface TextPanelOptions {
  /** Canvas font family. Default: system sans. */
  fontFamily?: string;
  /** Panel background. Default: "#ffffff". */
  background?: string;
  /** Outline color per box index. Default: deterministic LCG colors. */
  colorFn?: (index: number) => RgbColor;
  /** Padding around content bounds. Default: 8. */
  padding?: number;
}

export interface PanelBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export const DEFAULT_PANEL_BG = "#ffffff";
export const PANEL_TEXT_COLOR = "#000000";
const OUTLINE_LINE_WIDTH = 1;
const ROTATION_THRESHOLD_DEG = 5;
const VERTICAL_LINE_SPACING = 2;

export function pointX(p: PanelPoint): number {
  return Array.isArray(p) ? p[0] : p.x;
}

export function pointY(p: PanelPoint): number {
  return Array.isArray(p) ? p[1] : p.y;
}

/** Stable per-box color (LCG, same as Paddle's `deterministicColor`). */
export function deterministicColor(index: number): RgbColor {
  let seed = (index + 1) * 1103515245 + 12345;
  seed >>>= 0;
  const r = (seed >> 16) & 0xff;
  seed = (seed * 1103515245 + 12345) >>> 0;
  const g = (seed >> 16) & 0xff;
  seed = (seed * 1103515245 + 12345) >>> 0;
  const b = (seed >> 16) & 0xff;
  return [r, g, b];
}

export function polyBounds(poly: PanelPoint[]): PanelBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    const x = pointX(p);
    const y = pointY(p);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Angle (radians) of the quad's top edge — drives rotated text. */
export function topEdgeAngle(poly: PanelPoint[]): number {
  const dx = pointX(poly[1]) - pointX(poly[0]);
  const dy = pointY(poly[1]) - pointY(poly[0]);
  return Math.atan2(dy, dx);
}

export function needsRotation(angleRad: number): boolean {
  const absDeg = Math.abs(angleRad * (180 / Math.PI));
  return absDeg > ROTATION_THRESHOLD_DEG && absDeg < 180 - ROTATION_THRESHOLD_DEG;
}

/** Tall narrow box → stack chars vertically (CJK). Mirrors Paddle. */
export function isVerticalBox(bounds: PanelBounds): boolean {
  return bounds.height > 2 * bounds.width && bounds.height > 30;
}

export interface MeasuredPanel {
  width: number;
  height: number;
  /** Shift applied to box coords so content starts at (padding, padding). */
  shiftX: number;
  shiftY: number;
}

/** Canvas size fitting all boxes (+ padding). Null when nothing to draw. */
export function measureTextPanel(
  boxes: TextPanelBox[],
  padding = 8,
): MeasuredPanel | null {
  const polys = boxes.filter((b) => b.poly.length >= 2 && b.text.trim().length > 0);
  if (polys.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of polys) {
    const bb = polyBounds(b.poly);
    if (bb.minX < minX) minX = bb.minX;
    if (bb.minY < minY) minY = bb.minY;
    if (bb.maxX > maxX) maxX = bb.maxX;
    if (bb.maxY > maxY) maxY = bb.maxY;
  }
  const pad = Math.max(0, padding);
  return {
    width: Math.max(1, Math.ceil(maxX - minX + pad * 2)),
    height: Math.max(1, Math.ceil(maxY - minY + pad * 2)),
    shiftX: -minX + pad,
    shiftY: -minY + pad,
  };
}

function tracePoly(
  ctx: CanvasRenderingContext2D,
  poly: PanelPoint[],
  shiftX: number,
  shiftY: number,
): void {
  ctx.beginPath();
  ctx.moveTo(pointX(poly[0]) + shiftX, pointY(poly[0]) + shiftY);
  for (let i = 1; i < poly.length; i += 1) {
    ctx.lineTo(pointX(poly[i]) + shiftX, pointY(poly[i]) + shiftY);
  }
  ctx.closePath();
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  boxW: number,
  fromSize: number,
): number {
  let size = fromSize;
  const measured = ctx.measureText(text).width;
  if (measured > boxW && boxW > 0) {
    size = Math.max(8, Math.floor(size * (boxW / measured)));
  }
  return size;
}

/**
 * Paint the white panel: background, then per box a 1px colored outline
 * and black fitted text (vertical-stack / rotated / flat). Boxes are
 * shifted by (shiftX, shiftY) from `measureTextPanel`.
 */
export function drawTextPanel(
  ctx: CanvasRenderingContext2D,
  boxes: TextPanelBox[],
  measured: MeasuredPanel,
  options: TextPanelOptions = {},
): void {
  const { fontFamily = "sans-serif", background = DEFAULT_PANEL_BG } = options;
  const getColor = options.colorFn ?? deterministicColor;

  ctx.save();
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, measured.width, measured.height);
  ctx.restore();

  const font = (size: number) => `${size}px "${fontFamily}"`;

  boxes.forEach((box, i) => {
    if (box.poly.length < 2 || box.text.trim().length === 0) return;
    const [r, g, b] = getColor(i);
    const bb = polyBounds(box.poly);
    const angle = topEdgeAngle(box.poly);
    const rotated = needsRotation(angle);
    const vertical = isVerticalBox(bb);
    const x0 = bb.minX + measured.shiftX;
    const y0 = bb.minY + measured.shiftY;

    ctx.save();
    ctx.lineWidth = OUTLINE_LINE_WIDTH;
    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    tracePoly(ctx, box.poly, measured.shiftX, measured.shiftY);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = PANEL_TEXT_COLOR;

    if (vertical) {
      ctx.textBaseline = "top";
      const chars = Array.from(box.text);
      const count = Math.max(1, chars.length);
      let size = Math.max(8, Math.floor(bb.width * 0.8));
      if (count * (size + VERTICAL_LINE_SPACING) > bb.height) {
        size = Math.max(8, Math.floor((bb.height / count) * 0.8));
      }
      ctx.font = font(size);
      const widest = Math.max(...chars.map((c) => ctx.measureText(c).width));
      if (widest > bb.width && bb.width > 0) {
        size = Math.max(8, Math.floor(size * (bb.width / widest)));
        ctx.font = font(size);
      }
      const x = x0 + (bb.width - size) / 2;
      let y = y0 + 2;
      for (const ch of chars) {
        ctx.fillText(ch, x, y);
        y += size + VERTICAL_LINE_SPACING;
      }
    } else {
      ctx.textBaseline = "middle";
      let size = Math.max(12, Math.floor(bb.height * 0.8));
      size = fitFont(ctx, box.text, bb.width, size);
      ctx.font = font(size);
      if (rotated) {
        const cx = x0 + bb.width / 2;
        const cy = y0 + bb.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.fillText(box.text, -bb.width / 2, 0);
      } else {
        ctx.fillText(box.text, x0 + 2, y0 + bb.height / 2);
      }
    }
    ctx.restore();
  });
}

/** Render boxes to a canvas. Null when boxes are empty. */
export function renderTextPanelToCanvas(
  boxes: TextPanelBox[],
  options: TextPanelOptions = {},
): HTMLCanvasElement | null {
  const padding = options.padding ?? 8;
  const measured = measureTextPanel(boxes, padding);
  if (!measured) return null;
  const canvas = document.createElement("canvas");
  canvas.width = measured.width;
  canvas.height = measured.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawTextPanel(ctx, boxes, measured, options);
  return canvas;
}
