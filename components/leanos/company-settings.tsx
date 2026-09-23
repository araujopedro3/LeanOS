"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportWorkspace, parseWorkspaceBackup, type Workspace, type WorkspaceChanges } from "@/lib/leanos-storage";
import { SectionCard } from "./section-card";

export function CompanySettings({ workspace, onRestore }: { workspace: Workspace; onRestore: (changes: WorkspaceChanges) => boolean }) {
  const [preview, setPreview] = useState<WorkspaceChanges | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const selection = useRef(0);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportWorkspace(workspace)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `leanos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="space-y-5">
    <div><h2 className="text-2xl font-semibold">Configurações da empresa</h2><p className="mt-1 text-sm text-muted-foreground">Guarde uma cópia dos registros operacionais desta empresa.</p></div>
    <SectionCard title="Cópia de segurança" description="Processos, tarefas, medições e planos de melhoria. Senhas não são incluídas.">
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">Os dados ficam neste navegador. Exporte uma cópia antes de limpar o armazenamento ou trocar de dispositivo. Para restaurar, entre na mesma empresa e cadastre os responsáveis mencionados no arquivo.</p>
        <Button onClick={download}>Exportar backup</Button>
        <div className="space-y-2"><Label htmlFor="workspace-backup">Selecionar backup JSON</Label><Input id="workspace-backup" type="file" accept=".json,application/json" onChange={async (event) => {
          const file = event.target.files?.[0];
          const request = ++selection.current;
          setPreview(null); setError("");
          if (!file) { setBusy(false); return; }
          if (file.size > 10 * 1024 * 1024) { setBusy(false); setError("Selecione um arquivo de até 10 MB."); return; }
          setBusy(true);
          try {
            const content = await file.text();
            if (request === selection.current) setPreview(parseWorkspaceBackup(content, workspace));
          } catch { if (request === selection.current) setError("Backup inválido, de outra empresa ou com responsáveis não cadastrados. Nenhum registro foi alterado."); }
          finally { if (request === selection.current) setBusy(false); }
        }} /></div>
        {busy ? <p role="status">Validando arquivo…</p> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {preview ? <div className="space-y-3 rounded-lg border p-4">
          <p>{preview.processes?.length} processos · {preview.tasks?.length} tarefas · {preview.improvements?.length} melhorias</p>
          <p className="text-sm text-muted-foreground">A restauração substitui os registros operacionais atuais. Exporte o backup atual antes de continuar.</p>
          <Button onClick={() => { if (onRestore(preview)) { setPreview(null); toast.success("Backup restaurado"); } }}>Restaurar registros deste arquivo</Button>
          <Button variant="ghost" onClick={() => setPreview(null)}>Cancelar</Button>
        </div> : null}
      </div>
    </SectionCard>
  </div>;
}
