import { Badge } from "@/components/ui/badge";
import type { Priority } from "@/lib/leanos-data";

const statusStyles: Record<string, string> = {
  "Em andamento": "border-transparent bg-[#e0f2ee] text-[#0b6b5d]",
  "Em análise": "border-transparent bg-[#e7eafe] text-[#4b56a6]",
  "Concluído": "border-transparent bg-[#e9f5cf] text-[#4d7014]",
  "Concluída": "border-transparent bg-[#e9f5cf] text-[#4d7014]",
  "Planejado": "border-transparent bg-[#edf1f0] text-[#5d716d]",
  "Pendente": "border-transparent bg-[#edf1f0] text-[#5d716d]",
  "Atrasado": "border-transparent bg-[#fae7e4] text-[#a33731]",
  "Atrasada": "border-transparent bg-[#fae7e4] text-[#a33731]",
  "Proposta": "border-transparent bg-[#edf1f0] text-[#5d716d]",
  "Em execução": "border-transparent bg-[#fff0ce] text-[#8c5a00]",
  "Verificando": "border-transparent bg-[#e7eafe] text-[#4b56a6]",
  "Implementada": "border-transparent bg-[#e9f5cf] text-[#4d7014]",
};

const priorityStyles: Record<Priority, string> = {
  Baixa: "border-[#d9e5e2] bg-white text-[#607470]",
  Média: "border-[#d9e5e2] bg-white text-[#375b55]",
  Alta: "border-[#f1cf8d] bg-[#fff9ea] text-[#8c5a00]",
  Crítica: "border-[#eec2be] bg-[#fff4f2] text-[#a33731]",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={`font-medium ${statusStyles[status] ?? statusStyles.Planejado}`}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge variant="outline" className={`font-medium ${priorityStyles[priority]}`}>{priority}</Badge>;
}
