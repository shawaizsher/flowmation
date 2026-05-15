import { memo } from 'react';
import { EdgeProps, getBezierPath, MarkerType } from 'reactflow';
import { useStore } from '../../store';

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
  const sourceStatus = nodeStatuses[source];
  const isRunning = sourceStatus === 'running';
  const isSuccess = sourceStatus === 'success';
  const isFailed = sourceStatus === 'failed';

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.3,
  });

  // Compute visual state
  let strokeColor = 'rgba(148,163,184,0.22)';
  let strokeWidth = 1.5;
  let glowOpacity = 0;
  let glowColor = 'rgba(99,102,241,0.18)';

  if (selected) {
    strokeColor = 'rgba(129,140,248,0.8)';
    strokeWidth = 2;
    glowOpacity = 1;
    glowColor = 'rgba(99,102,241,0.18)';
  } else if (isRunning) {
    strokeColor = 'rgba(96,165,250,0.6)';
    strokeWidth = 2;
    glowOpacity = 1;
    glowColor = 'rgba(59,130,246,0.18)';
  } else if (isSuccess) {
    strokeColor = 'rgba(52,211,153,0.45)';
    strokeWidth = 1.8;
    glowOpacity = 0.6;
    glowColor = 'rgba(16,185,129,0.14)';
  } else if (isFailed) {
    strokeColor = 'rgba(239,68,68,0.4)';
    strokeWidth = 1.6;
    glowOpacity = 0.6;
    glowColor = 'rgba(239,68,68,0.12)';
  }

  // Unique IDs for gradient/clip references
  const gradientId = `edge-gradient-${id}`;
  const filterId = `edge-glow-${id}`;

  return (
    <>
      {/* Glow layer */}
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

      {/* Main edge path */}
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

      {/* Flowing particle animation when source node is running */}
      {isRunning && (
        <>
          {/* Primary particle */}
          <circle r="3.5" fill="#60A5FA" opacity="0.9" filter={`url(#${filterId}-particle)`}>
            <animateMotion dur="1.1s" repeatCount="indefinite" path={edgePath} />
          </circle>

          {/* Trailing particle 1 */}
          <circle r="2.5" fill="#93C5FD" opacity="0.6">
            <animateMotion dur="1.1s" repeatCount="indefinite" begin="0.36s" path={edgePath} />
          </circle>

          {/* Trailing particle 2 */}
          <circle r="1.5" fill="#BFDBFE" opacity="0.35">
            <animateMotion dur="1.1s" repeatCount="indefinite" begin="0.72s" path={edgePath} />
          </circle>

          {/* Particle glow filter */}
          <defs>
            <filter id={`${filterId}-particle`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </>
      )}

      {/* Success pulse — single traveling flash */}
      {isSuccess && (
        <circle r="2.5" fill="#34D399" opacity="0.7">
          <animateMotion dur="1.6s" repeatCount="1" path={edgePath} />
          <animate attributeName="opacity" values="0.7;0.2;0" dur="1.6s" repeatCount="1" />
        </circle>
      )}
    </>
  );
});
