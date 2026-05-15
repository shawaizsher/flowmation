import { memo } from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';
import { useStore } from '../../store';
import { useTheme } from '../../hooks/useTheme';

export default memo(function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  source,
}: EdgeProps) {
  const nodeStatuses = useStore((s) => s.nodeStatuses);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const sourceStatus = nodeStatuses[source];
  const isRunning = sourceStatus === 'running';
  const isSuccess = sourceStatus === 'success';
  const isFailed  = sourceStatus === 'failed';

  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    curvature: 0.3,
  });

  // ── Stroke color + glow based on state and theme ──
  let strokeColor = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.32)';
  let strokeWidth = 1.5;
  let glowOpacity = 0;
  let glowColor   = 'transparent';

  if (selected) {
    strokeColor = isDark ? 'rgba(129,140,248,0.85)' : 'rgba(79,70,229,0.9)';
    strokeWidth = 2;
    glowOpacity = 1;
    glowColor   = isDark ? 'rgba(99,102,241,0.18)' : 'rgba(79,70,229,0.14)';
  } else if (isRunning) {
    strokeColor = isDark ? 'rgba(96,165,250,0.65)'  : 'rgba(37,99,235,0.75)';
    strokeWidth = 2;
    glowOpacity = 1;
    glowColor   = isDark ? 'rgba(59,130,246,0.18)' : 'rgba(37,99,235,0.14)';
  } else if (isSuccess) {
    strokeColor = isDark ? 'rgba(52,211,153,0.48)'  : 'rgba(5,150,105,0.65)';
    strokeWidth = 1.8;
    glowOpacity = 0.7;
    glowColor   = isDark ? 'rgba(16,185,129,0.14)' : 'rgba(5,150,105,0.1)';
  } else if (isFailed) {
    strokeColor = isDark ? 'rgba(239,68,68,0.42)'   : 'rgba(185,28,28,0.6)';
    strokeWidth = 1.6;
    glowOpacity = 0.7;
    glowColor   = isDark ? 'rgba(239,68,68,0.12)' : 'rgba(185,28,28,0.1)';
  }

  const filterId = `edge-glow-${id}`;

  return (
    <>
      {/* Glow halo */}
      {glowOpacity > 0 && (
        <path
          d={edgePath}
          fill="none"
          stroke={glowColor}
          strokeWidth={10}
          strokeLinecap="round"
          opacity={glowOpacity}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Main path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={style}
        markerEnd={markerEnd}
      />

      {/* Flowing particles during execution */}
      {isRunning && (
        <>
          <circle r="3.5" fill={isDark ? '#60A5FA' : '#2563EB'} opacity="0.9" filter={`url(#${filterId}-p)`}>
            <animateMotion dur="1.1s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="2.5" fill={isDark ? '#93C5FD' : '#60A5FA'} opacity="0.6">
            <animateMotion dur="1.1s" repeatCount="indefinite" begin="0.36s" path={edgePath} />
          </circle>
          <circle r="1.5" fill={isDark ? '#BFDBFE' : '#93C5FD'} opacity="0.35">
            <animateMotion dur="1.1s" repeatCount="indefinite" begin="0.72s" path={edgePath} />
          </circle>
          <defs>
            <filter id={`${filterId}-p`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </>
      )}

      {/* Success pulse */}
      {isSuccess && (
        <circle r="2.5" fill={isDark ? '#34D399' : '#059669'} opacity="0.7">
          <animateMotion dur="1.6s" repeatCount="1" path={edgePath} />
          <animate attributeName="opacity" values="0.7;0.2;0" dur="1.6s" repeatCount="1" />
        </circle>
      )}
    </>
  );
});
