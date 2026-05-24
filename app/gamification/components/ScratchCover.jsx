/**
 * ScratchCover.jsx
 * app/gamification/components/ScratchCover.jsx
 *
 * CHANGE vs previous version:
 *   - Accepts optional `width` and `height` props so MiniGameCard can
 *     render the same tear geometry at 90×COVER_H instead of 160×200.
 *   - Falls back to existing isTablet defaults when props are omitted,
 *     so GameCard is completely unaffected.
 *
 * Everything else — buildTearPath, ScratchLines, clip logic, flash
 * animation — is identical to the original.
 */

import React, { useEffect, useRef } from "react";
import { StyleSheet, Animated } from "react-native";
import Svg, {
  Defs,
  ClipPath,
  Path,
  Rect,
  Image as SvgImage,
  Line,
} from "react-native-svg";

import { isTablet } from "../../theme/tokens";

const DEFAULT_W = isTablet ? 220 : 160;
const DEFAULT_H = isTablet ? 270 : 200;

// ─────────────────────────────────────────────────────────────────────────────
// TEAR GEOMETRY
// ─────────────────────────────────────────────────────────────────────────────
function buildTearPath(progress, W, H) {
  if (progress === 0) return null;

  const tearHalfW = progress === 1 ? W * 0.13 : W * 0.24;

  const cx1 = W * 0.22, cy1 = H * 0.14;
  const cx2 = W * 0.78, cy2 = H * 0.86;

  const steps = 14;

  const dxC = cx2 - cx1, dyC = cy2 - cy1;
  const lineLen = Math.sqrt(dxC * dxC + dyC * dyC);
  const ux = dxC / lineLen, uy = dyC / lineLen;
  const px = -uy, py = ux;

  const leftPts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = cx1 + dxC * t;
    const cy = cy1 + dyC * t;
    const jaggle = tearHalfW * (0.5 + 0.5 * Math.sin(i * 2.4 + 0.8));
    leftPts.push({ x: cx - px * jaggle, y: cy - py * jaggle });
  }

  const rightPts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = cx1 + dxC * t;
    const cy = cy1 + dyC * t;
    const jaggle = tearHalfW * (0.55 + 0.45 * Math.sin(i * 1.8 + 2.1));
    rightPts.push({ x: cx + px * jaggle, y: cy + py * jaggle });
  }

  const allPts = [...leftPts, ...[...rightPts].reverse()];

  const outerRect = `M 0,0 L ${W},0 L ${W},${H} L 0,${H} Z`;
  const innerPoly =
    allPts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ") + " Z";

  return { path: `${outerRect} ${innerPoly}`, leftPts, rightPts };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRATCH LINES
// ─────────────────────────────────────────────────────────────────────────────
function ScratchLines({ storiesCompleted, W, H }) {
  const count = storiesCompleted === 1 ? 6 : 11;

  const cx1 = W * 0.22, cy1 = H * 0.14;
  const cx2 = W * 0.78, cy2 = H * 0.86;
  const dxC = cx2 - cx1, dyC = cy2 - cy1;
  const lineLen = Math.sqrt(dxC * dxC + dyC * dyC);
  const ux = dxC / lineLen, uy = dyC / lineLen;
  const px = -uy, py = ux;
  const tearHalfW = storiesCompleted === 1 ? W * 0.09 : W * 0.18;

  const lines = [];
  for (let i = 0; i < count; i++) {
    const t = 0.15 + (i / (count - 1)) * 0.7;
    const perpOffset =
      tearHalfW * 0.6 * (Math.sin(i * 1.9 + 0.4) * (i % 2 === 0 ? 1 : -0.7));
    const midX = cx1 + dxC * t + px * perpOffset;
    const midY = cy1 + dyC * t + py * perpOffset;
    // Scale scratch length proportionally to card width
    const scratchLen = (W * 0.09) * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.3)));

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

// Helper: inner polygon points for tear edge stroke
function buildInnerPolyPoints(progress, W, H) {
  const tearHalfW = progress === 1 ? W * 0.13 : W * 0.24;
  const cx1 = W * 0.22, cy1 = H * 0.14;
  const cx2 = W * 0.78, cy2 = H * 0.86;
  const dxC = cx2 - cx1, dyC = cy2 - cy1;
  const lineLen = Math.sqrt(dxC * dxC + dyC * dyC);
  const px = -dyC / lineLen, py = dxC / lineLen;
  const steps = 14;

  const leftPts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = cx1 + dxC * t, cy = cy1 + dyC * t;
    const jaggle = tearHalfW * (0.5 + 0.5 * Math.sin(i * 2.4 + 0.8));
    leftPts.push({ x: cx - px * jaggle, y: cy - py * jaggle });
  }
  const rightPts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = cx1 + dxC * t, cy = cy1 + dyC * t;
    const jaggle = tearHalfW * (0.55 + 0.45 * Math.sin(i * 1.8 + 2.1));
    rightPts.push({ x: cx + px * jaggle, y: cy + py * jaggle });
  }
  return [...leftPts, ...[...rightPts].reverse()];
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRATCH COVER
// ─────────────────────────────────────────────────────────────────────────────
export default function ScratchCover({
  storiesCompleted,
  width,   // optional — pass for mini size; omit to use GameCard defaults
  height,  // optional — pass for mini size; omit to use GameCard defaults
}) {
  const W = width  ?? DEFAULT_W;
  const H = height ?? DEFAULT_H;

  const fadeAnim = useRef(new Animated.Value(1)).current;

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

  const tearData = buildTearPath(storiesCompleted, W, H);

  // Unique clipPath id per size+progress so multiple cards on screen
  // don't share the same SVG defs and clip each other incorrectly.
  const clipId = `scratchClip_${W}_${H}_${storiesCompleted}`;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}
    >
      <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <ClipPath id={clipId}>
            {tearData ? (
              <Path d={tearData.path} fillRule="evenodd" />
            ) : (
              <Rect x={0} y={0} width={W} height={H} />
            )}
          </ClipPath>
        </Defs>

        {/* Golden cover image — clipped to hide the tear area */}
        <SvgImage
          href={require("../../../assets/games/scratch-cover.jpeg")}
          x={0}
          y={0}
          width={W}
          height={H}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />

        {/* Golden shimmer on tear edges */}
        {tearData && (
          <Path
            d={
              buildInnerPolyPoints(storiesCompleted, W, H)
                .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                .join(" ") + " Z"
            }
            fill="none"
            stroke="rgba(255, 215, 80, 0.6)"
            strokeWidth={isTablet ? 2.2 : 1.6}
            strokeLinejoin="round"
          />
        )}

        {/* Scratch marks inside the tear */}
        {tearData && (
          <ScratchLines storiesCompleted={storiesCompleted} W={W} H={H} />
        )}
      </Svg>
    </Animated.View>
  );
}
