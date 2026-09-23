"use client";

import { Activity, AlertTriangle, ArrowDown, ArrowRight, CheckCircle2, CircleGauge, Clock3, ListTodo, Sparkles, TimerReset, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { avg, getBottleneck, processAverage, processById, trendByPeriod, type Improvement, type LeanProcess, type Period, type TaskItem } from "@/lib/leanos-data";
import { EvolutionChart, ImprovementChart, StatusChart } from "./analytics-charts";
import { PriorityBadge, StatusBadge } from "./badges";
import { ProcessTable } from "./process-table";
import { SectionCard } from "./section-card";

export function Dashboard({ processes, tasks, improvements, period, loading, statusFilter, onStatusFilter, onTaskStatus, onOpenMeasurement, onNavigate }: {
  processes: LeanProcess[];
  tasks: TaskItem[];
  improvements: Improvement[];
  period: Period;
  loading: boolean;
  statusFilter: string;
  onStatusFilter: (value: string) => void;
  onTaskStatus: (id: string) => void;
  onOpenMeasurement: () => void;
  onNavigate: (page: string) => void;
}) {
  if (loading) return <DashboardSkeleton />;

  const measured = processes.filter((process) => process.stages.some((stage) => stage.measurements.length));
  const average = measured.length ? Math.round(avg(measured.map(processAverage))) : 0;
  const previousAverage = trendByPeriod[period][0]?.avg ?? average;
  const timeVariation = previousAverage ? Math.round(((average - previousAverage) / previousAverage) * 100) : 0;
  const allBottlenecks = measured.map((process) => ({ process, ...getBottleneck(process) })).sort((a, b) => b.minutes - a.minutes);
  const topBottleneck = allBottlenecks[0];
  const filteredProcesses = statusFilter === "Todos" ? processes : processes.filter((process) => process.status === statusFilter);
  const openTasks = tasks.filter((task) => task.status !== "Concluída");
  const completedImprovements = improvements.filter((item) => item.status === "Implementada");
  const verified = improvements.filter((item) => item.after !== null);
  const avgReduction = verified.length ? Math.round(avg(verified.map((item) => ((item.before - (item.after ?? item.before)) / item.before) * 100))) : 0;
  const statusCounts = [
    { name: "Em andamento", value: processes.filter((p) => p.status === "Em andamento" || p.status === "Em análise").length },
    { name: "Concluídos", value: processes.filter((p) => p.status === "Concluído").length },
    { name: "Atrasados", value: processes.filter((p) => p.status === "Atrasado").length },
    { name: "Planejados", value: processes.filter((p) => p.status === "Planejado").length },
  ];

  const kpis = [
    { title: "Tempo médio", value: `${average} min`, note: `${Math.abs(timeVariation)}% vs. início do período`, tone: timeVariation <= 0 ? "positive" : "negative", icon: TimerReset },
    { title: "Gargalos ativos", value: String(allBottlenecks.filter((item) => item.share >= 35).length), note: "etapas acima de 35%", tone: "warning", icon: AlertTriangle },
    { title: "Tarefas abertas", value: String(openTasks.length), note: `${tasks.filter((task) => task.status === "Atrasada").length} fora do prazo`, tone: "neutral", icon: ListTodo },
    { title: "Redução comprovada", value: `${avgReduction}%`, note: `${completedImprovements.length} melhoria implementada`, tone: "positive", icon: TrendingDown },
  ];

  return (
    <div className="space-y-5 pb-10">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <div className="metric-grid overflow-hidden rounded-2xl border border-[#cadbd7] bg-[#eaf3f0] p-5 sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#bbd3ce] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[.08em] text-[#2f625b]">
                <CircleGauge className="size-3.5" /> Pulso operacional
              </div>
              <p className="text-sm font-medium text-[#52706b]">Situação neste momento</p>
              <h2 className="mt-1 max-w-xl text-2xl font-semibold tracking-[-.035em] text-[#123d37] sm:text-[2rem]">
                Operação estável, com um gargalo relevante em {topBottleneck?.process.name.toLowerCase() ?? "análise"}.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#52706b]">
                O tempo médio caiu no período, mas a etapa “{topBottleneck?.name ?? "sem dados"}” ainda concentra a maior oportunidade de melhoria.
              </p>
            </div>
            <Button onClick={onOpenMeasurement} className="shrink-0 bg-[#123d37] text-white hover:bg-[#0a5348]">Registrar medição <Clock3 className="size-4" /></Button>
          </div>
        </div>

        <div className="rounded-2xl bg-[#0b3d39] p-5 text-white shadow-[0_14px_34px_rgba(8,47,45,.16)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.09em] text-[#b9d3cd]">Requer atenção</p>
              <h3 className="mt-2 text-lg font-semibold">{topBottleneck?.process.name ?? "Sem dados"}</h3>
            </div>
            <span className="rounded-full bg-[#dff66c] px-2.5 py-1 text-xs font-semibold text-[#173b35]">{topBottleneck?.share ?? 0}%</span>
          </div>
          <p className="mt-4 text-sm text-[#cbe0db]">Gargalo: <strong className="text-white">{topBottleneck?.name ?? "Sem medições"}</strong></p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#dff66c]" style={{ width: `${topBottleneck?.share ?? 0}%` }} /></div>
          <button onClick={() => onNavigate("Melhorias")} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-md text-sm font-semibold text-[#dff66c] hover:text-white">Abrir plano de melhoria <ArrowRight className="size-4" /></button>
        </div>
      </section>

      <section aria-label="Indicadores principais" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <EvolutionChart data={trendByPeriod[period]} period={period} />
        <StatusChart counts={statusCounts} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_.55fr]">
        <SectionCard
          title="Processos prioritários"
          description="Acompanhamento do fluxo, prazo e responsável"
          action={<Select value={statusFilter} onValueChange={onStatusFilter}><SelectTrigger size="sm" aria-label="Filtrar processos por status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="Em andamento">Em andamento</SelectItem><SelectItem value="Em análise">Em análise</SelectItem><SelectItem value="Atrasado">Atrasados</SelectItem><SelectItem value="Concluído">Concluídos</SelectItem></SelectContent></Select>}
        >
          <ProcessTable processes={filteredProcesses.slice(0, 5)} compact />
          <div className="border-t px-5 py-3"><Button variant="ghost" size="sm" onClick={() => onNavigate("Processos")}>Ver todos os processos <ArrowRight className="size-4" /></Button></div>
        </SectionCard>

        <SectionCard title="Alertas" description="Itens que precisam de ação">
          <div className="divide-y">
            <AlertItem level="Crítico" title="Processo fora do prazo" description="Separação de pedidos venceu em 12/09." />
            <AlertItem level="Atenção" title="Indicador acima da meta" description="Cotação está 17 min acima da meta." />
            <AlertItem level="Informação" title="Comparação disponível" description="Nova medição da triagem foi registrada." />
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Tarefas pendentes" description="Próximas ações do ciclo de melhoria">
          <div className="divide-y">
            {openTasks.slice(0, 4).map((task) => {
              const process = processById(processes, task.processId);
              return (
                <div key={task.id} className="flex items-start gap-3 px-5 py-4">
                  <button onClick={() => onTaskStatus(task.id)} aria-label={`Marcar ${task.title} como concluída`} className="focus-ring mt-0.5 rounded-full text-[#79908b] hover:text-primary"><CheckCircle2 className="size-5" /></button>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-5">{task.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{process?.name} · {task.owner} · prazo {task.due}</p>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              );
            })}
          </div>
          <div className="border-t px-5 py-3"><Button variant="ghost" size="sm" onClick={() => onNavigate("Tarefas")}>Abrir tarefas <ArrowRight className="size-4" /></Button></div>
        </SectionCard>

        <ImprovementChart data={trendByPeriod[period]} />
      </section>

      <section id="improvements-section" className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <SectionCard title="Melhorias contínuas" description="Comparação dos indicadores antes e depois">
          <div className="divide-y">
            {improvements.map((item) => {
              const reduction = item.after === null ? null : Math.round(((item.before - item.after) / item.before) * 100);
              return (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><div className="mb-2 flex items-center gap-2"><StatusBadge status={item.status} /><span className="text-xs text-muted-foreground">{item.id}</span></div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm text-muted-foreground">{processById(processes, item.processId)?.name} · {item.stage}</p></div>
                    <div className="flex items-center gap-3 rounded-xl bg-[#f6f9f8] px-3 py-2 text-sm">
                      <div><span className="block text-xs text-muted-foreground">Antes</span><strong>{item.before} min</strong></div><ArrowRight className="size-4 text-muted-foreground" /><div><span className="block text-xs text-muted-foreground">Depois</span><strong>{item.after === null ? "—" : `${item.after} min`}</strong></div>
                      {reduction !== null ? <span className="rounded-md bg-[#e7f3ca] px-2 py-1 font-semibold text-[#517213]">−{reduction}%</span> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Atividade recente" description="Histórico das últimas atualizações">
          <ol className="space-y-0 px-5 py-2">
            <ActivityItem icon={Clock3} title="Medição registrada" detail="Cleberson · Análise da solicitação · 32 min" time="há 18 min" />
            <ActivityItem icon={CheckCircle2} title="Tarefa concluída" detail="Nicollas · Comparar tempos após padronização" time="há 2 h" />
            <ActivityItem icon={Sparkles} title="Melhoria atualizada" detail="Gustavo · Conferência por zona de armazenagem" time="ontem" />
            <ActivityItem icon={Activity} title="Indicador recalculado" detail="Rayssa · Aprovação de compras" time="ontem" last />
          </ol>
        </SectionCard>
      </section>
    </div>
  );
}

function KpiCard({ title, value, note, tone, icon: Icon }: { title: string; value: string; note: string; tone: string; icon: typeof Clock3 }) {
  const tones: Record<string, string> = { positive: "bg-[#e8f3ca] text-[#507115]", negative: "bg-[#fae7e4] text-[#a33731]", warning: "bg-[#fff0ce] text-[#8c5a00]", neutral: "bg-[#e7efed] text-[#47615d]" };
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(8,47,45,.04)] transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-muted-foreground">{title}</p><span className={`rounded-lg p-2 ${tones[tone]}`}><Icon className="size-4" /></span></div>
      <p className="mt-3 text-2xl font-semibold tracking-[-.035em] tabular-nums">{value}</p>
      <p className={`mt-1.5 flex items-center gap-1 text-xs ${tone === "positive" ? "text-[#5c7d20]" : tone === "negative" ? "text-[#a33731]" : "text-muted-foreground"}`}>
        {tone === "positive" ? <ArrowDown className="size-3.5" /> : null}{note}
      </p>
    </div>
  );
}

function AlertItem({ level, title, description }: { level: string; title: string; description: string }) {
  const colors: Record<string, string> = { Crítico: "bg-[#fae7e4] text-[#a33731]", Atenção: "bg-[#fff0ce] text-[#8c5a00]", Informação: "bg-[#e0f2ee] text-[#0b6b5d]" };
  return <div className="flex gap-3 px-5 py-4"><span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${colors[level]}`}><AlertTriangle className="size-4" /></span><div><p className="text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground">{level}</p><p className="mt-0.5 font-medium">{title}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p></div></div>;
}

function ActivityItem({ icon: Icon, title, detail, time, last = false }: { icon: typeof Activity; title: string; detail: string; time: string; last?: boolean }) {
  return <li className="relative flex gap-3 py-3"><div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-white text-primary"><Icon className="size-4" /></div>{!last ? <span className="absolute bottom-0 left-[15px] top-10 w-px bg-border" /> : null}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="font-medium">{title}</p><span className="whitespace-nowrap text-xs text-muted-foreground">{time}</span></div><p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p></div></li>;
}

function DashboardSkeleton() {
  return <div className="space-y-5"><Skeleton className="h-56 rounded-2xl" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((item) => <Skeleton key={item} className="h-32 rounded-2xl" />)}</div><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-80 rounded-2xl lg:col-span-2" /><Skeleton className="h-80 rounded-2xl" /></div></div>;
}

