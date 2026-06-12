import React from 'react';
import { cn } from '../../lib/utils';

// ─── Sparkline ────────────────────────────────────────────────────────────────
// Pure SVG sparkline. Zero dependencies. Data = array of numbers.

interface SparklineProps {
  data:        number[];
  width?:      number;
  height?:     number;
  color?:      string;
  fillColor?:  string;
  className?:  string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width  = 64,
  height = 24,
  color  = '#6366f1',
  fillColor,
  className,
}) => {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} className={className} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 2;
  const w = width  - padding * 2;
  const h = height - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * w;
    const y = padding + h - ((v - min) / range) * h;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const polyline = points.join(' ');

  // Fill area under the line
  const first = points[0];
  const last  = points[points.length - 1];
  const fillPath = `M ${first} L ${polyline.split(' ').slice(1).join(' L ')} L ${last.split(',')[0]},${padding + h} L ${padding},${padding + h} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      aria-hidden="true"
    >
      {fillColor && (
        <path
          d={fillPath}
          fill={fillColor}
          opacity="0.15"
        />
      )}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Terminal dot */}
      <circle
        cx={points[points.length - 1].split(',')[0]}
        cy={points[points.length - 1].split(',')[1]}
        r="2"
        fill={color}
      />
    </svg>
  );
};

Sparkline.displayName = 'Sparkline';
