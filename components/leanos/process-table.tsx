"use client";

import { useState } from "react";
import { ArrowUpRight, Clock3, Gauge, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { displayDate } from "@/lib/leanos-storage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBottleneck, processAverage, type LeanProcess } from "@/lib/leanos-data";
import { PriorityBadge, StatusBadge } from "./badges";

export function ProcessTable({ processes, compact = false, onUpdate, onOpenImprovements }: { processes: LeanProcess[]; compact?: boolean; onUpdate?: (process: LeanProcess) => boolean; onOpenImprovements?: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = processes.find((process) => process.id === selectedId);

  if (!processes.length) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 rounded-full bg-muted p-3"><Gauge className="size-5 text-muted-foreground" /></div>
        <p className="font-medium">Nenhum processo encontrado</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Ajuste os filtros ou cadastre um processo para iniciar as medições.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-[#f7faf9] hover:bg-[#f7faf9]">
            <TableHead className="pl-5">Processo</TableHead>
            <TableHead>Status</TableHead>
            {!compact ? <TableHead>Responsável</TableHead> : null}
            <TableHead>Progresso</TableHead>
            {!compact ? <TableHead>Prioridade</TableHead> : null}
            <TableHead>Prazo</TableHead>
            <TableHead className="w-12"><span className="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processes.map((process) => (
            <TableRow key={process.id} className="cursor-pointer" onClick={() => setSelectedId(process.id)} tabIndex={0} onKeyDown={(event) => event.key === "Enter" && setSelectedId(process.id)}>
              <TableCell className="pl-5">
                <div className="font-medium text-[#183f3a]">{process.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{process.id} · {process.category}</div>
              </TableCell>
              <TableCell><StatusBadge status={process.status} /></TableCell>
              {!compact ? <TableCell className="text-muted-foreground">{process.owner}</TableCell> : null}
              <TableCell>
                <div className="flex min-w-28 items-center gap-2">
                  <Progress value={process.progress} className="h-1.5" />
                  <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{process.progress}%</span>
                </div>
              </TableCell>
              {!compact ? <TableCell><PriorityBadge priority={process.priority} /></TableCell> : null}
              <TableCell className={process.status === "Atrasado" ? "font-medium text-[#a33731]" : "text-muted-foreground"}>{displayDate(process.due)}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" aria-label={`Abrir ${process.name}`} onClick={(event) => { event.stopPropagation(); setSelectedId(process.id); }}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected ? <ProcessDetails process={selected} onUpdate={onUpdate} onOpenImprovements={onOpenImprovements ? () => { setSelectedId(null); onOpenImprovements(); } : undefined} /> : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function ProcessDetails({ process, onUpdate, onOpenImprovements }: { process: LeanProcess; onUpdate?: (process: LeanProcess) => boolean; onOpenImprovements?: () => void }) {
  const bottleneck = getBottleneck(process);
  return (
    <div>
      <SheetHeader className="border-b px-6 py-5">
        <div className="mb-2 flex items-center gap-2"><StatusBadge status={process.status} /><PriorityBadge priority={process.priority} /></div>
        <SheetTitle className="text-xl">{process.name}</SheetTitle>
        <SheetDescription>{process.id} · Responsável: {process.owner} · Atualizado {process.updated.toLowerCase()}</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 p-6">
        {onUpdate ? <div className="space-y-2"><p className="text-sm font-medium">Situação do processo</p><Select value={process.status} onValueChange={(value) => onUpdate({ ...process, status: value as LeanProcess["status"], progress: value === "Concluído" ? 100 : process.progress === 100 ? 0 : process.progress, updated: "Agora" })}><SelectTrigger aria-label="Situação do processo"><SelectValue /></SelectTrigger><SelectContent>{(["Planejado", "Em andamento", "Em análise", "Atrasado", "Concluído"] as const).map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div> : null}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-[#f7faf9] p-4">
            <Clock3 className="mb-3 size-5 text-primary" />
            <p className="text-2xl font-semibold tabular-nums">{Math.round(processAverage(process))} min</p>
            <p className="text-sm text-muted-foreground">Tempo médio total</p>
          </div>
          <div className="rounded-xl border bg-[#f7faf9] p-4">
            <Gauge className="mb-3 size-5 text-primary" />
            <p className="text-2xl font-semibold tabular-nums">{bottleneck.share}%</p>
            <p className="text-sm text-muted-foreground">Concentrado no gargalo</p>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Fluxo e tempos</h3>
            <span className="text-xs text-muted-foreground">média por etapa</span>
          </div>
          <ol className="space-y-2">
            {process.stages.map((stage) => {
              const value = stage.measurements.length ? stage.measurements.reduce((a,b) => a+b, 0) / stage.measurements.length : 0;
              const isBottleneck = bottleneck.name === stage.name && value > 0;
              return (
                <li key={stage.id} className={`relative rounded-xl border p-4 ${isBottleneck ? "border-[#ddbc67] bg-[#fff9e8]" : "bg-white"}`}>
                  <div className="flex items-start gap-3">
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isBottleneck ? "bg-[#f2cf72] text-[#513a00]" : "bg-secondary text-secondary-foreground"}`}>{stage.order}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-medium">{stage.name}</p>
                        <p className="font-mono text-sm font-semibold">{value ? `${Math.round(value)} min` : "Sem dados"}</p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e7eeec]">
                        <div className={`h-full rounded-full ${isBottleneck ? "bg-[#d79a18]" : "bg-primary"}`} style={{ width: `${value ? Math.max(12, (value / Math.max(1, bottleneck.minutes)) * 100) : 0}%` }} />
                      </div>
                      {isBottleneck ? <p className="mt-2 text-xs font-medium text-[#89600d]">Gargalo identificado automaticamente · {bottleneck.share}% do tempo</p> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <Button className="w-full" onClick={() => onOpenImprovements ? onOpenImprovements() : document.getElementById("improvements-section")?.scrollIntoView({ behavior: "smooth" })}>
          Ver plano de melhoria <ArrowUpRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
