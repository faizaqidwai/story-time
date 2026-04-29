/**
 * ScratchCover.jsx
 * app/gamification/components/ScratchCover.jsx
 *
 * Renders the golden mystery cover image over a game card with a
 * programmatic scratch/tear effect using react-native-svg.
 *
 * HOW IT WORKS:
 * The cover image fills the card. A ClipPath made of two polygons
 * with fillRule="evenodd" creates a "hole" in the cover:
 *   Polygon 1 = full card rectangle (fills everything)
 *   Polygon 2 = jagged tear shape   (even-odd rule cuts it as a hole)
 * The result: cover visible everywhere EXCEPT the tear hole.
 *
 * TEAR STATES:
 *   0 stories → full cover, no tear
 *   1 story   → small diagonal slash ~25% revealed
 *   2 stories → larger slash ~55% revealed
 *   3 stories → engine flips to REVEALED, this component unmounts
 *
 * ASSET REQUIRED:
 *   Place your golden cover image at:
 *   assets/games/scratch-cover.png
 */

import React, { useEffect, useRef } from "react";
import { StyleSheet, Animated } from "react-native";
import Svg, {
  Defs,
  ClipPath,
  Path,
  Rect,
  Image as SvgImage,
  Polygon,
  Line,
} from "react-native-svg";

import { isTablet } from "../../theme/tokens";

const W = isTablet ? 220 : 160;
const H = isTablet ? 270 : 200;

// ─────────────────────────────────────────────────────────────────────────────
// TEAR GEOMETRY
// Builds the jagged polygon that defines the revealed hole.
// Returns an SVG path string using the evenodd approach:
//   M (outer rect) Z M (inner jagged polygon) Z
// This creates a compound path where the inner shape cuts a hole.
// ─────────────────────────────────────────────────────────────────────────────
function buildTearPath(progress) {
  if (progress === 0) return null;

  // How wide the tear is — grows with progress
  const tearHalfW = progress === 1 ? W * 0.13 : W * 0.24;

  // Center diagonal line: upper-left → lower-right (matching reference image)
  const cx1 = W * 0.22,
    cy1 = H * 0.14;
  const cx2 = W * 0.78,
    cy2 = H * 0.86;

  const steps = 14; // more steps = more jagged teeth

  // Unit vector along center line
  const dxC = cx2 - cx1,
    dyC = cy2 - cy1;
  const lineLen = Math.sqrt(dxC * dxC + dyC * dyC);
  const ux = dxC / lineLen,
    uy = dyC / lineLen;
  // Perpendicular unit vector (points "left" of the line direction)
  const px = -uy,
    py = ux;

  // Build left edge points (top → bottom along center line, offset left)
  const leftPts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = cx1 + dxC * t;
    const cy = cy1 + dyC * t;
    // Jagged tooth — deterministic, different for left and right
    const jaggle = tearHalfW * (0.5 + 0.5 * Math.sin(i * 2.4 + 0.8));
    leftPts.push({ x: cx - px * jaggle, y: cy - py * jaggle });
  }

  // Build right edge points (top → bottom, offset right, reversed for polygon)
  const rightPts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = cx1 + dxC * t;
    const cy = cy1 + dyC * t;
    const jaggle = tearHalfW * (0.55 + 0.45 * Math.sin(i * 1.8 + 2.1));
    rightPts.push({ x: cx + px * jaggle, y: cy + py * jaggle });
  }

  // Combine into closed polygon: left top→bottom, right bottom→top
  const allPts = [...leftPts, ...[...rightPts].reverse()];

  // Build SVG compound path:
  //   M = outer card rect (so evenodd fills everything)
  //   Z M = inner tear polygon (evenodd punches a hole)
  const outerRect = `M 0,0 L ${W},0 L ${W},${H} L 0,${H} Z`;
  const innerPoly =
    allPts
      .map(
        (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
      )
      .join(" ") + " Z";

  return { path: `${outerRect} ${innerPoly}`, leftPts, rightPts };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRATCH LINES
// Thin white diagonal lines inside the tear, mimicking scratch marks
// from the reference image
// ─────────────────────────────────────────────────────────────────────────────
function ScratchLines({ storiesCompleted }) {
  const count = storiesCompleted === 1 ? 6 : 11;

  const cx1 = W * 0.22,
    cy1 = H * 0.14;
  const cx2 = W * 0.78,
    cy2 = H * 0.86;
  const dxC = cx2 - cx1,
    dyC = cy2 - cy1;
  const lineLen = Math.sqrt(dxC * dxC + dyC * dyC);
  const ux = dxC / lineLen,
    uy = dyC / lineLen;
  const px = -uy,
    py = ux;
  const tearHalfW = storiesCompleted === 1 ? W * 0.09 : W * 0.18;

  const lines = [];
  for (let i = 0; i < count; i++) {
    const t = 0.15 + (i / (count - 1)) * 0.7;
    const perpOffset =
      tearHalfW * 0.6 * (Math.sin(i * 1.9 + 0.4) * (i % 2 === 0 ? 1 : -0.7));
    const midX = cx1 + dxC * t + px * perpOffset;
    const midY = cy1 + dyC * t + py * perpOffset;
    const scratchLen =
      (isTablet ? 18 : 13) * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.3)));

    lines.push({
      x1: (midX - ux * scratchLen * 0.5).toFixed(1),
      y1: (midY - uy * scratchLen * 0.5).toFixed(1),
      x2: (midX + ux * scratchLen * 0.5).toFixed(1),
      y2: (midY + uy * scratchLen * 0.5).toFixed(1),
      opacity: (0.1 + (i % 3) * 0.06).toFixed(2),
    });
  }

  return (
    <>
      {lines.map((l, i) => (
        <Line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={`rgba(255,255,255,${l.opacity})`}
          strokeWidth={isTablet ? 1.1 : 0.85}
          strokeLinecap="round"
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRATCH COVER
// ─────────────────────────────────────────────────────────────────────────────
export default function ScratchCover({ storiesCompleted }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Brief flash on each new scratch — makes the reveal feel satisfying
  useEffect(() => {
    if (storiesCompleted === 0) return;
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.82,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1.0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [storiesCompleted]);

  const tearData = buildTearPath(storiesCompleted);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}
    >
      <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <ClipPath id={`scratchClip_${storiesCompleted}`}>
            {tearData ? (
              // Compound path with evenodd cuts the hole
              <Path d={tearData.path} fillRule="evenodd" />
            ) : (
              // No tear — clip is the full card
              <Rect x={0} y={0} width={W} height={H} />
            )}
          </ClipPath>
        </Defs>

        {/* Golden cover image — only visible outside the tear hole */}
        <SvgImage
          href={require("../../../assets/games/scratch-cover.jpeg")}
          x={0}
          y={0}
          width={W}
          height={H}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#scratchClip_${storiesCompleted})`}
        />

        {/* Golden shimmer on the tear edges */}
        {tearData && (
          <Path
            d={
              // Just the inner tear polygon for the stroke (no outer rect)
              [...buildInnerPolyPoints(storiesCompleted)]
                .map(
                  (p, i) =>
                    `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
                )
                .join(" ") + " Z"
            }
            fill="none"
            stroke="rgba(255, 215, 80, 0.6)"
            strokeWidth={isTablet ? 2.2 : 1.6}
            strokeLinejoin="round"
          />
        )}

        {/* Scratch line marks inside the tear */}
        {tearData && <ScratchLines storiesCompleted={storiesCompleted} />}
      </Svg>
    </Animated.View>
  );
}

// Helper: returns just the inner polygon points for the tear edge stroke
function buildInnerPolyPoints(progress) {
  const tearHalfW = progress === 1 ? W * 0.13 : W * 0.24;
  const cx1 = W * 0.22,
    cy1 = H * 0.14;
  const cx2 = W * 0.78,
    cy2 = H * 0.86;
  const dxC = cx2 - cx1,
    dyC = cy2 - cy1;
  const lineLen = Math.sqrt(dxC * dxC + dyC * dyC);
  const px = -dyC / lineLen,
    py = dxC / lineLen;
  const steps = 14;

  const leftPts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = cx1 + dxC * t,
      cy = cy1 + dyC * t;
    const jaggle = tearHalfW * (0.5 + 0.5 * Math.sin(i * 2.4 + 0.8));
    leftPts.push({ x: cx - px * jaggle, y: cy - py * jaggle });
  }
  const rightPts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = cx1 + dxC * t,
      cy = cy1 + dyC * t;
    const jaggle = tearHalfW * (0.55 + 0.45 * Math.sin(i * 1.8 + 2.1));
    rightPts.push({ x: cx + px * jaggle, y: cy + py * jaggle });
  }
  return [...leftPts, ...[...rightPts].reverse()];
}
