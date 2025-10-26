import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';

interface DifficultyVolumeChartProps {
  data: Array<{
    keyword: string;
    volume: number;
    difficulty: number;
    opportunity: number;
    intent: string;
  }>;
}

const INTENT_COLORS: Record<string, string> = {
  informational: '#3B82F6',
  commercial: '#EAB308',
  transactional: '#10B981',
  navigational: '#8B5CF6',
  local: '#F97316',
};

export const DifficultyVolumeChart: React.FC<DifficultyVolumeChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{data.keyword}</p>
          <p className="text-sm text-gray-600">Volume: {data.volume.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Difficulty: {data.difficulty.toFixed(1)}</p>
          <p className="text-sm text-gray-600">Opportunity: {data.opportunity.toFixed(1)}</p>
          <p className="text-sm text-gray-600">Intent: {data.intent}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid />
        <XAxis
          type="number"
          dataKey="volume"
          name="Volume"
          label={{ value: 'Search Volume', position: 'insideBottom', offset: -10 }}
        />
        <YAxis
          type="number"
          dataKey="difficulty"
          name="Difficulty"
          label={{ value: 'Difficulty', angle: -90, position: 'insideLeft' }}
        />
        <ZAxis type="number" dataKey="opportunity" range={[50, 400]} />
        <Tooltip content={<CustomTooltip />} />
        <Scatter
          name="Keywords"
          data={data}
          fill="#667eea"
          shape={(props: any) => {
            const { cx, cy, payload } = props;
            const color = INTENT_COLORS[payload.intent] || '#667eea';
            return <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.7} />;
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};
