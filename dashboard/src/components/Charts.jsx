import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// Sample data for charts
const rankingData = [
  { month: 'Jan', position: 8.5, improved: 3 },
  { month: 'Feb', position: 7.2, improved: 5 },
  { month: 'Mar', position: 6.1, improved: 7 },
  { month: 'Apr', position: 5.3, improved: 8 },
  { month: 'May', position: 4.8, improved: 10 },
  { month: 'Jun', position: 4.2, improved: 12 },
]

const trafficData = [
  { month: 'Jan', organic: 12400, direct: 3200, referral: 1800 },
  { month: 'Feb', organic: 15600, direct: 3500, referral: 2100 },
  { month: 'Mar', organic: 18900, direct: 3800, referral: 2400 },
  { month: 'Apr', organic: 21200, direct: 4100, referral: 2600 },
  { month: 'May', organic: 23800, direct: 4400, referral: 2900 },
  { month: 'Jun', organic: 24500, direct: 4600, referral: 3100 },
]

const keywordData = [
  { keyword: 'SEO Tools', position: 2, volume: 12000, traffic: 3600 },
  { keyword: 'Rank Tracker', position: 4, volume: 8500, traffic: 1700 },
  { keyword: 'Keyword Research', position: 3, volume: 10200, traffic: 2550 },
  { keyword: 'Backlink Checker', position: 5, volume: 7200, traffic: 1080 },
  { keyword: 'Site Audit', position: 1, volume: 9800, traffic: 4900 },
]

const backlinkData = [
  { month: 'Jan', total: 847, new: 23, lost: 5 },
  { month: 'Feb', total: 912, new: 71, lost: 6 },
  { month: 'Mar', total: 1034, new: 128, lost: 6 },
  { month: 'Apr', total: 1156, new: 129, lost: 7 },
  { month: 'May', total: 1221, new: 73, lost: 8 },
  { month: 'Jun', total: 1247, new: 34, lost: 8 },
]

export function RankingChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={rankingData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="month"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          reversed
          domain={[0, 10]}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="position"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))' }}
          name="Avg Position"
        />
        <Line
          type="monotone"
          dataKey="improved"
          stroke="hsl(142 76% 36%)"
          strokeWidth={2}
          dot={{ fill: 'hsl(142 76% 36%)' }}
          name="Keywords Improved"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function TrafficChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={trafficData}>
        <defs>
          <linearGradient id="organic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="direct" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="referral" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(24 95% 53%)" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="hsl(24 95% 53%)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="month"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="organic"
          stroke="hsl(var(--primary))"
          fillOpacity={1}
          fill="url(#organic)"
          name="Organic"
        />
        <Area
          type="monotone"
          dataKey="direct"
          stroke="hsl(142 76% 36%)"
          fillOpacity={1}
          fill="url(#direct)"
          name="Direct"
        />
        <Area
          type="monotone"
          dataKey="referral"
          stroke="hsl(24 95% 53%)"
          fillOpacity={1}
          fill="url(#referral)"
          name="Referral"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function KeywordChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={keywordData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis
          type="category"
          dataKey="keyword"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          width={150}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Bar dataKey="traffic" fill="hsl(var(--primary))" name="Traffic" radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BacklinkChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={backlinkData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="month"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="total"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          dot={{ fill: 'hsl(var(--primary))', r: 4 }}
          name="Total Backlinks"
        />
        <Line
          type="monotone"
          dataKey="new"
          stroke="hsl(142 76% 36%)"
          strokeWidth={2}
          dot={{ fill: 'hsl(142 76% 36%)', r: 3 }}
          name="New"
        />
        <Line
          type="monotone"
          dataKey="lost"
          stroke="hsl(0 84.2% 60.2%)"
          strokeWidth={2}
          dot={{ fill: 'hsl(0 84.2% 60.2%)', r: 3 }}
          name="Lost"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
