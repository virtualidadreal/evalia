import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface CompetencyData {
  competency: string
  self?: number
  manager?: number
  peers?: number
}

interface CompetencyRadarProps {
  data: CompetencyData[]
  maxScore?: number
}

export function CompetencyRadar({ data, maxScore = 5 }: CompetencyRadarProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="competency"
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
        />
        <PolarRadiusAxis
          domain={[0, maxScore]}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Radar
          name="Autoevaluación"
          dataKey="self"
          stroke="hsl(var(--chart-1))"
          fill="hsl(var(--chart-1))"
          fillOpacity={0.15}
        />
        <Radar
          name="Manager"
          dataKey="manager"
          stroke="hsl(var(--chart-2))"
          fill="hsl(var(--chart-2))"
          fillOpacity={0.15}
        />
        <Radar
          name="Pares"
          dataKey="peers"
          stroke="hsl(var(--chart-3))"
          fill="hsl(var(--chart-3))"
          fillOpacity={0.15}
        />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  )
}
