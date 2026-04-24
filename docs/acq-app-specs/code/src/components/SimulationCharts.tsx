// A reusable chart component for displaying pipeline metrics in bar form.  To use
// this component, pass an array of objects with `name` and `value` keys.  The
// component uses Recharts for simple bar charts and hides axes to minimize
// distraction【429982028471656†L142-L167】.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ChartDatum {
  name: string
  value: number
}

interface SimulationChartsProps {
  data: ChartDatum[]
}

export function SimulationCharts({ data }: SimulationChartsProps) {
  return (
    <div className="mt-4">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" hide />
          <YAxis hide />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
