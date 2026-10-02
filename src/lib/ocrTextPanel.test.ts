import { describe, it, expect } from "vitest";
import {
  deterministicColor,
  isVerticalBox,
  measureTextPanel,
  needsRotation,
  pointX,
  pointY,
  polyBounds,
  topEdgeAngle,
} from "./ocrTextPanel";

describe("ocrTextPanel geometry", () => {
  it("reads both {x,y} and tuple points", () => {
    expect(pointX({ x: 3, y: 4 })).toBe(3);
    expect(pointY([5, 6])).toBe(6);
  });

  it("computes quad bounds", () => {
    const bb = polyBounds([
      { x: 10, y: 20 },
      { x: 50, y: 22 },
      { x: 48, y: 40 },
      { x: 10, y: 38 },
    ]);
    expect(bb).toMatchObject({ minX: 10, minY: 20, maxX: 50, maxY: 40 });
    expect(bb.width).toBe(40);
    expect(bb.height).toBe(20);
  });

  it("detects flat vs rotated top edges", () => {
    const flat = topEdgeAngle([
      [0, 0],
      [100, 0],
      [100, 20],
      [0, 20],
    ]);
    expect(needsRotation(flat)).toBe(false);
    expect(needsRotation((30 * Math.PI) / 180)).toBe(true);
    expect(needsRotation((179 * Math.PI) / 180)).toBe(false);
  });

  it("flags tall narrow boxes as vertical", () => {
    expect(isVerticalBox({ minX: 0, minY: 0, maxX: 10, maxY: 100, width: 10, height: 100 })).toBe(true);
    expect(isVerticalBox({ minX: 0, minY: 0, maxX: 100, maxY: 20, width: 100, height: 20 })).toBe(false);
    // Tiny boxes never count as vertical (noise guard).
    expect(isVerticalBox({ minX: 0, minY: 0, maxX: 5, maxY: 12, width: 5, height: 12 })).toBe(false);
  });

  it("gives stable per-index colors", () => {
    expect(deterministicColor(0)).toEqual(deterministicColor(0));
    expect(deterministicColor(0)).not.toEqual(deterministicColor(1));
  });

  it("measures panel size from content bounds + padding", () => {
    const m = measureTextPanel(
      [{ poly: [{ x: 10, y: 20 }, { x: 50, y: 20 }, { x: 50, y: 40 }, { x: 10, y: 40 }], text: "你好" }],
      8,
    );
    expect(m).toMatchObject({ width: 56, height: 36, shiftX: -2, shiftY: -12 });
  });

  it("returns null for empty boxes", () => {
    expect(measureTextPanel([], 8)).toBeNull();
    expect(measureTextPanel([{ poly: [], text: "" }], 8)).toBeNull();
  });
});
