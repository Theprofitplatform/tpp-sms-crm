import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface TrafficTimelineChartProps {
  data: Array<{ month: string; projected_traffic: number }>;
}

export const TrafficTimelineChart: React.FC<TrafficTimelineChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{data.month}</p>
          <p className="text-sm text-gray-600">
            Projected Traffic: {data.projected_traffic.toLocaleString()} visits/month
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="projected_traffic"
          stroke="#667eea"
          fillOpacity={1}
          fill="url(#colorTraffic)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
