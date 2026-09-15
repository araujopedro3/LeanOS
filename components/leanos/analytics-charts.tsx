"use client";

import { Bar, BarChart, CartesianGrid, Cell, Label, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { SectionCard } from "./section-card";
import type { Period } from "@/lib/leanos-data";

const lineConfig = {
  avg: { label: "Tempo médio", color: "#0b5d52" },
  target: { label: "Meta", color: "#a9c446" },
} satisfies ChartConfig;

const barConfig = {
  improvements: { label: "Melhorias", color: "#35a28e" },
} satisfies ChartConfig;

const statusColors: Record<string, string> = {
  "Em andamento": "#0b7c6a",
  "Concluídos": "#a9c446",
  "Atrasados": "#d85c51",
  "Planejados": "#c9d4d1",
};

export function EvolutionChart({ data, period }: { data: { label: string; avg: number; target: number }[]; period: Period }) {
  const descriptions: Record<Period, string> = {
    today: "Tempo médio por faixa horária",
    "7d": "Tempo médio nos últimos 7 dias",
    "30d": "Tempo médio nos últimos 30 dias",
    "90d": "Tempo médio nos últimos 90 dias",
    "12m": "Tempo médio nos últimos 12 meses",
    custom: "Tempo médio no intervalo personalizado",
  };

  return (
    <SectionCard title="Evolução do tempo" description={descriptions[period]} className="lg:col-span-2">
      <div className="px-3 pb-3 pt-5 sm:px-5">
        <ChartContainer config={lineConfig} className="h-[260px] w-full aspect-auto">
          <LineChart data={data} margin={{ left: -12, right: 12, top: 8, bottom: 4 }} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 4" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
            <YAxis unit=" min" tickLine={false} axisLine={false} width={58} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Line dataKey="target" type="monotone" stroke="var(--color-target)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line dataKey="avg" type="monotone" stroke="var(--color-avg)" strokeWidth={3} dot={{ r: 3, fill: "var(--color-avg)" }} activeDot={{ r: 5 }} />
          </LineChart>
        </ChartContainer>
      </div>
    </SectionCard>
  );
}

export function StatusChart({ counts }: { counts: { name: string; value: number }[] }) {
  const total = counts.reduce((sum, item) => sum + item.value, 0);
  return (
    <SectionCard title="Situação dos processos" description="Distribuição por status">
      <div className="grid grid-cols-[1fr_130px] items-center gap-2 p-4">
        <ChartContainer config={{}} className="h-[190px] w-full aspect-auto">
          <PieChart accessibilityLayer>
            <Pie data={counts} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} strokeWidth={0}>
              {counts.map((item) => <Cell key={item.name} fill={statusColors[item.name]} />)}
              <Label content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 4} className="fill-foreground text-2xl font-semibold">{total}</tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 18} className="fill-muted-foreground text-xs">processos</tspan>
                  </text>;
                }
                return null;
              }} />
            </Pie>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          </PieChart>
        </ChartContainer>
        <div className="space-y-3">
          {counts.map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-sm">
              <span className="size-2.5 rounded-full" style={{ background: statusColors[item.name] }} />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.name}</span>
              <strong className="tabular-nums">{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

export function ImprovementChart({ data }: { data: { label: string; improvements: number }[] }) {
  return (
    <SectionCard title="Melhorias no período" description="Ações registradas por intervalo">
      <div className="px-3 pb-3 pt-5 sm:px-5">
        <ChartContainer config={barConfig} className="h-[220px] w-full aspect-auto">
          <BarChart data={data} margin={{ left: -24, right: 8, top: 8 }} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip cursor={{ fill: "#eef4f2" }} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="improvements" fill="var(--color-improvements)" radius={[6, 6, 2, 2]} maxBarSize={38} />
          </BarChart>
        </ChartContainer>
      </div>
    </SectionCard>
  );
}
