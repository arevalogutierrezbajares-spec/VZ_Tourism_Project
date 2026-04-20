'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DailyRevenue {
  date: string;
  revenue: number;
}

interface RevenueChartProps {
  data: DailyRevenue[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const hasData = data.some((d) => d.revenue > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily Revenue — Last 30 Days</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval={4}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `$${v}`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => [`$${(value as number).toFixed(2)}`, 'Revenue']}
                  labelStyle={{ fontSize: 11 }}
                  contentStyle={{ fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
            {/* Accessible data table (sr-only) */}
            <table className="sr-only" aria-label="Daily revenue data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Revenue (USD)</th>
                </tr>
              </thead>
              <tbody>
                {data.filter((d) => d.revenue > 0).map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td>${d.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="h-52 flex flex-col items-center justify-center text-sm text-muted-foreground">
            <p className="font-medium">No revenue data yet</p>
            <p className="text-xs mt-1">Revenue will appear here as bookings are completed.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
