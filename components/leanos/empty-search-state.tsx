import { SearchX } from "lucide-react";

export function EmptySearchState() {
  return <div className="flex flex-col items-center px-6 py-12 text-center"><SearchX className="mb-3 size-7 text-muted-foreground" /><p className="font-medium">Nenhum resultado</p><p className="mt-1 text-sm text-muted-foreground">Tente buscar pelo nome, responsável ou identificador.</p></div>;
}
