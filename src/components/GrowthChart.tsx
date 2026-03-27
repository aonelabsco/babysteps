'use client';

import { WHO, PERCENTILE_LABELS } from '@/lib/who-data';
import type { GrowthRecord } from '@/lib/types';
import type { BabySex } from '@/lib/types';

type Metric = 'weight' | 'length' | 'head';

interface GrowthChartProps {
  records: GrowthRecord[];
  birthday: number;
  sex: BabySex;
  metric: Metric;
  weightUnit: 'kg' | 'lbs';
  lengthUnit: 'cm' | 'in';
}

const CHART_W = 340;
const CHART_H = 200;
const PAD = { top: 10, right: 10, bottom: 30, left: 40 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top - PAD.bottom;

function convertWeight(kg: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? Math.round(kg * 2.20462 * 10) / 10 : kg;
}

function convertLength(cm: number, unit: 'cm' | 'in'): number {
  return unit === 'in' ? Math.round(cm / 2.54 * 10) / 10 : cm;
}

export default function GrowthChart({ records, birthday, sex, metric, weightUnit, lengthUnit }: GrowthChartProps) {
  const sexKey = sex === 'male' ? 'boys' : 'girls';
  const whoData = WHO[metric][sexKey];

  const convert = (val: number) => {
    if (metric === 'weight') return convertWeight(val, weightUnit);
    if (metric === 'length' || metric === 'head') return convertLength(val, lengthUnit);
    return val;
  };

  // Y range from WHO data
  const allWhoValues = whoData.flatMap((row) => [row[0], row[4]]).map(convert);
  const yMin = Math.floor(Math.min(...allWhoValues) * 0.95);
  const yMax = Math.ceil(Math.max(...allWhoValues) * 1.02);
  const yRange = yMax - yMin;

  // X range: 0-24 months
  const xMax = 24;

  const scaleX = (month: number) => PAD.left + (month / xMax) * INNER_W;
  const scaleY = (val: number) => PAD.top + INNER_H - ((val - yMin) / yRange) * INNER_H;

  // Build percentile paths
  const percentilePaths = [0, 1, 2, 3, 4].map((pIdx) => {
    const points = whoData.map((row, month) => {
      const val = convert(row[pIdx]);
      return `${scaleX(month)},${scaleY(val)}`;
    });
    return `M${points.join('L')}`;
  });

  // Band fills (P3-P15, P15-P50, P50-P85, P85-P97)
  const bandPairs = [[0, 1], [1, 2], [2, 3], [3, 4]];
  const bandColors = ['rgba(99,102,241,0.08)', 'rgba(99,102,241,0.15)', 'rgba(99,102,241,0.15)', 'rgba(99,102,241,0.08)'];

  const bandPaths = bandPairs.map(([lo, hi]) => {
    const topPoints = whoData.map((row, month) => `${scaleX(month)},${scaleY(convert(row[hi]))}`);
    const bottomPoints = [...whoData].map((row, month) => `${scaleX(month)},${scaleY(convert(row[lo]))}`).reverse();
    return `M${topPoints.join('L')}L${bottomPoints.join('L')}Z`;
  });

  // Baby's data points
  const dataPoints = records
    .filter((r) => {
      if (metric === 'weight') return r.weight != null;
      if (metric === 'length') return r.length != null;
      return r.headCircumference != null;
    })
    .map((r) => {
      const ageMs = r.date - birthday;
      const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.44);
      const raw = metric === 'weight' ? r.weight! : metric === 'length' ? r.length! : r.headCircumference!;
      return { month: Math.max(0, Math.min(24, ageMonths)), value: convert(raw) };
    })
    .sort((a, b) => a.month - b.month);

  const dataPath = dataPoints.length >= 2
    ? `M${dataPoints.map((p) => `${scaleX(p.month)},${scaleY(p.value)}`).join('L')}`
    : null;

  const unitLabel = metric === 'weight' ? weightUnit : lengthUnit;

  // Y axis ticks
  const yTickCount = 5;
  const yStep = yRange / yTickCount;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => {
    const val = yMin + i * yStep;
    return Math.round(val * 10) / 10;
  });

  // X axis ticks (every 3 months)
  const xTicks = [0, 3, 6, 9, 12, 15, 18, 21, 24];

  return (
    <div>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yTicks.map((val) => (
          <line key={`yg-${val}`} x1={PAD.left} y1={scaleY(val)} x2={CHART_W - PAD.right} y2={scaleY(val)} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        ))}

        {/* Percentile bands */}
        {bandPaths.map((d, i) => (
          <path key={`band-${i}`} d={d} fill={bandColors[i]} />
        ))}

        {/* Percentile lines */}
        {percentilePaths.map((d, i) => (
          <path
            key={`p-${i}`}
            d={d}
            fill="none"
            stroke={i === 2 ? 'rgba(99,102,241,0.6)' : 'rgba(99,102,241,0.25)'}
            strokeWidth={i === 2 ? 1.2 : 0.6}
            strokeDasharray={i === 2 ? undefined : '3,3'}
          />
        ))}

        {/* Percentile labels on right side */}
        {[0, 2, 4].map((i) => {
          const lastVal = convert(whoData[24][i]);
          return (
            <text key={`pl-${i}`} x={CHART_W - PAD.right + 2} y={scaleY(lastVal)} fill="rgba(148,163,184,0.5)" fontSize="7" dominantBaseline="middle">
              {PERCENTILE_LABELS[i]}
            </text>
          );
        })}

        {/* Baby data line */}
        {dataPath && (
          <path d={dataPath} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Baby data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={scaleX(p.month)} cy={scaleY(p.value)} r="3.5" fill="#22d3ee" stroke="#0e1525" strokeWidth="1.5" />
        ))}

        {/* Y axis labels */}
        {yTicks.map((val) => (
          <text key={`yl-${val}`} x={PAD.left - 4} y={scaleY(val)} fill="rgba(148,163,184,0.6)" fontSize="8" textAnchor="end" dominantBaseline="middle">
            {val}
          </text>
        ))}

        {/* X axis labels */}
        {xTicks.map((month) => (
          <text key={`xl-${month}`} x={scaleX(month)} y={CHART_H - 6} fill="rgba(148,163,184,0.6)" fontSize="8" textAnchor="middle">
            {month}
          </text>
        ))}

        {/* Axis labels */}
        <text x={CHART_W / 2} y={CHART_H} fill="rgba(148,163,184,0.4)" fontSize="7" textAnchor="middle">
          age (months)
        </text>
        <text x={8} y={PAD.top + INNER_H / 2} fill="rgba(148,163,184,0.4)" fontSize="7" textAnchor="middle" transform={`rotate(-90, 8, ${PAD.top + INNER_H / 2})`}>
          {unitLabel}
        </text>
      </svg>
    </div>
  );
}
