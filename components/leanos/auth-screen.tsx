"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validEmail, validateEmployees, type CompanyProfile, type EmployeeDraft } from "@/lib/leanos-storage";

export function AuthScreen({
  onCancelAuth,
  companyProfile,
  employees,
  onAdminLogin,
  onCompanyLogin,
  onCompanyRegister,
}: {
  onCancelAuth: () => void;
  companyProfile: CompanyProfile | null;
  employees: EmployeeDraft[];
  onAdminLogin: (login: string, password: string) => boolean;
  onCompanyLogin: (company: string, password: string) => Promise<boolean>;
  onCompanyRegister: (profile: CompanyProfile, employeeList: EmployeeDraft[]) => Promise<boolean>;
}) {
  const [adminLogin, setAdminLogin] = useState("ADM");
  const [adminPassword, setAdminPassword] = useState("");
  const [companyLoginName, setCompanyLoginName] = useState("");
  const [companyLoginPassword, setCompanyLoginPassword] = useState("");
  const [companyName, setCompanyName] = useState(companyProfile?.nome ?? "");
  const [companyCnpj, setCompanyCnpj] = useState(companyProfile?.cnpj ?? "");
  const [companyEmail, setCompanyEmail] = useState(companyProfile?.email ?? "");
  const [companyPhone, setCompanyPhone] = useState(companyProfile?.telefone ?? "");
  const [companyPassword, setCompanyPassword] = useState("");
  const [employeeDrafts, setEmployeeDrafts] = useState<EmployeeDraft[]>(employees.length > 0 ? employees : [
    { nome: "", cargo: "", email: "", senha: "" },
  ]);
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(0);
  const cancelPending = () => { pending.current += 1; onCancelAuth(); setBusy(false); };
  const [activeView, setActiveView] = useState<"menu" | "admin" | "company" | "register">("menu");
  const [choicePressed, setChoicePressed] = useState(false);

  const updateEmployee = (index: number, field: keyof EmployeeDraft, value: string) => {
    setEmployeeDrafts((current) => current.map((employee, employeeIndex) => employeeIndex === index ? { ...employee, [field]: value } : employee));
  };

  const addEmployee = () => setEmployeeDrafts((current) => [...current, { nome: "", cargo: "", email: "", senha: "" }]);

  const handleAdminSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (onAdminLogin(adminLogin, adminPassword)) { setAuthError(""); return; }
      setAuthError("Credenciais do administrador inválidas. Use ADM / 123");
    } catch { setAuthError("Não foi possível acessar o armazenamento deste navegador."); }
  };

  const handleCompanyLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const request = ++pending.current;
    setBusy(true);
    try {
      const success = await onCompanyLogin(companyLoginName.trim(), companyLoginPassword);
      if (request !== pending.current) return;
      setAuthError(success ? "" : "Empresa não cadastrada ou senha incorreta.");
    } catch {
      if (request !== pending.current) return;
      setAuthError("Não foi possível carregar a empresa. Verifique o armazenamento local; os dados foram preservados.");
    } finally { if (request === pending.current) setBusy(false); }
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const profile: CompanyProfile = {
      nome: companyName.trim(),
      cnpj: companyCnpj.trim(),
      email: companyEmail.trim(),
      telefone: companyPhone.trim(),
      senha: companyPassword,
    };

    if (!profile.nome || !profile.cnpj || !profile.email || !profile.telefone || !profile.senha) {
      setAuthError("Preencha todos os dados da empresa e defina uma senha.");
      return;
    }

    const validEmployees = employeeDrafts.filter((employee) => employee.nome.trim() || employee.cargo.trim() || employee.email.trim());
    if (validEmployees.length === 0) {
      setAuthError("Cadastre pelo menos um funcionário ou use a conta administrativa.");
      return;
    }

    const hasMissingEmployeeData = validEmployees.some((employee) => !employee.nome.trim() || !employee.email.trim() || !employee.cargo.trim() || !employee.senha.trim());
    if (hasMissingEmployeeData) {
      setAuthError("Cada funcionário precisa de nome, cargo, e-mail e senha.");
      return;
    }

    if (!validEmail(profile.email)) { setAuthError("Informe um e-mail válido para a empresa."); return; }
    if (busy) return;
    const request = ++pending.current;
    setBusy(true);
    try {
      validateEmployees(validEmployees);
      const success = await onCompanyRegister(profile, validEmployees);
      if (request === pending.current && success) setAuthError("");
    } catch (error) { if (request === pending.current) setAuthError(error instanceof Error ? error.message : "Não foi possível salvar a empresa."); }
    finally { if (request === pending.current) setBusy(false); }
  };

  const renderMenu = () => (
    <div className="flex min-h-[420px] items-center justify-center">
      <div className="grid w-full max-w-2xl gap-4 md:grid-cols-3">
        <button type="button" onPointerDown={() => setChoicePressed(true)} onPointerUp={() => setChoicePressed(false)} onPointerLeave={() => setChoicePressed(false)} onClick={() => { cancelPending(); setAuthError(""); setActiveView("admin"); }} className="login-choice rounded-2xl border border-[#dfe8e5] bg-[#f7faf9] p-6 text-center text-xl font-semibold tracking-[-.03em] text-[#173b35] transition hover:border-[#b9d2cd] hover:bg-[#eef7f5]">
          <span className="block text-xs uppercase tracking-[.18em] text-[#5e7a76]">ADM</span>
          <span className="mt-2 block">Login</span>
        </button>

        <button type="button" onPointerDown={() => setChoicePressed(true)} onPointerUp={() => setChoicePressed(false)} onPointerLeave={() => setChoicePressed(false)} onClick={() => { cancelPending(); setAuthError(""); setActiveView("company"); }} className="login-choice rounded-2xl border border-[#dfe8e5] bg-[#eef7f5] p-6 text-center text-xl font-semibold tracking-[-.03em] text-[#173b35] transition hover:border-[#b9d2cd] hover:bg-[#e4f5f0]">
          <span className="block text-xs uppercase tracking-[.18em] text-[#5e7a76]">Empresa</span>
          <span className="mt-2 block">Entrar</span>
        </button>

        <button type="button" onPointerDown={() => setChoicePressed(true)} onPointerUp={() => setChoicePressed(false)} onPointerLeave={() => setChoicePressed(false)} onClick={() => { cancelPending(); setAuthError(""); setActiveView("register"); }} className="login-choice rounded-2xl border border-[#dfe8e5] bg-[#dff66c] p-6 text-center text-xl font-semibold tracking-[-.03em] text-[#173b35] transition hover:bg-[#d4f15e]">
          <span className="block text-xs uppercase tracking-[.18em] text-[#5e7a76]">Nova</span>
          <span className="mt-2 block">Empresa</span>
        </button>
      </div>
    </div>
  );

  const renderBackButton = () => (
    <button type="button" onClick={() => { cancelPending(); setActiveView("menu"); setAuthError(""); }} className="mb-4 inline-flex items-center text-sm font-medium text-[#173b35] underline-offset-4 hover:underline">
      ← Voltar
    </button>
  );

  return (
    <div className="login-stage flex min-h-screen items-center justify-center p-6">
      <div className="login-card w-full max-w-6xl overflow-hidden rounded-[32px] border border-[#dfe8e5] bg-white/90 shadow-[0_30px_80px_rgba(23,59,53,0.12)] backdrop-blur-xl">
        <div className="grid gap-0 md:grid-cols-[1.1fr_1.4fr]">
          <div className={`login-brand-panel flex items-center justify-center bg-[#173b35] p-8 text-white md:p-10 ${choicePressed ? "login-brand-panel-press" : ""}`}>
            <div className="login-brand flex items-center gap-3">
              <span className="login-logo flex size-11 items-center justify-center rounded-2xl bg-[#dff66c] text-xl font-black text-[#173b35]">L</span>
              <div>
                <p className="text-xs uppercase tracking-[.2em] text-[#dff66c]">LeanOS</p>
                <h1 className="login-brand-title text-3xl font-semibold tracking-[-.04em]">Gestão operacional</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 md:p-8">
            <div className="login-form w-full max-w-3xl">
              {authError ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{authError}</div> : null}

              {activeView === "menu" && renderMenu()}

              {activeView !== "menu" && (
                <>
                  {renderBackButton()}

                  {activeView === "admin" && (
                    <div className="rounded-2xl border bg-[#f7faf9] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#3d5b57]">Login ADM</p>
                    <form onSubmit={handleAdminSubmit} className="mt-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="admin-login" className="block">Usuário</Label>
                        <Input id="admin-login" value={adminLogin} onChange={(event) => setAdminLogin(event.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="admin-password" className="block">Senha</Label>
                        <Input id="admin-password" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="123" />
                      </div>
                      <Button disabled={busy} type="submit" className="w-full bg-[#173b35] text-white hover:bg-[#214b46]">Entrar como ADM</Button>
                    </form>
                  </div>
                )}

                  {activeView === "company" && (
                    <div className="rounded-2xl border bg-[#f7faf9] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#3d5b57]">Login da empresa</p>
                      <form onSubmit={handleCompanyLoginSubmit} className="mt-4 space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="company-login-name" className="block">Nome da empresa</Label>
                          <Input id="company-login-name" value={companyLoginName} onChange={(event) => setCompanyLoginName(event.target.value)} placeholder="Ex.: M3 Logística" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="company-login-password" className="block">Senha da empresa</Label>
                          <Input id="company-login-password" type="password" value={companyLoginPassword} onChange={(event) => setCompanyLoginPassword(event.target.value)} placeholder="Sua senha" />
                        </div>
                        <Button disabled={busy} type="submit" variant="outline" className="w-full">Entrar na empresa</Button>
                      </form>
                    </div>
                  )}

                  {activeView === "register" && (
                    <form onSubmit={handleRegisterSubmit} className="space-y-5 rounded-2xl border border-[#dfe8e5] bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#3d5b57]">Cadastro da empresa</p>
                        <h2 className="text-2xl font-semibold tracking-[-.04em] text-[#173b35]">Dados da operação</h2>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addEmployee}>+ Funcionário</Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="company-name" className="block">Nome da empresa</Label>
                        <Input id="company-name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Nome da empresa" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company-cnpj" className="block">CNPJ</Label>
                        <Input id="company-cnpj" value={companyCnpj} onChange={(event) => setCompanyCnpj(event.target.value)} placeholder="00.000.000/0000-00" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company-email" className="block">E-mail</Label>
                        <Input id="company-email" type="email" value={companyEmail} onChange={(event) => setCompanyEmail(event.target.value)} placeholder="contato@empresa.com" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company-phone" className="block">Telefone</Label>
                        <Input id="company-phone" value={companyPhone} onChange={(event) => setCompanyPhone(event.target.value)} placeholder="(00) 00000-0000" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="company-password" className="block">Crie uma senha da empresa</Label>
                        <Input id="company-password" type="password" value={companyPassword} onChange={(event) => setCompanyPassword(event.target.value)} placeholder="Defina uma senha" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm font-medium text-[#173b35]">Funcionários</p>
                      {employeeDrafts.map((employee, index) => (
                        <div key={index} className="grid gap-3 rounded-xl border border-[#e4eeeb] bg-[#f8faf9] p-4 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="block">Nome</Label>
                            <Input value={employee.nome} onChange={(event) => updateEmployee(index, "nome", event.target.value)} placeholder="Nome completo" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="block">Função do trabalhador</Label>
                            <Input value={employee.cargo} onChange={(event) => updateEmployee(index, "cargo", event.target.value)} placeholder="Ex.: Analista de produção" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="block">E-mail</Label>
                            <Input value={employee.email} onChange={(event) => updateEmployee(index, "email", event.target.value)} placeholder="funcionario@empresa.com" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="block">Senha</Label>
                            <Input type="password" value={employee.senha} onChange={(event) => updateEmployee(index, "senha", event.target.value)} placeholder="Senha do funcionário" />
                          </div>
                        </div>
                      ))}
                    </div>

                      <Button disabled={busy} type="submit" className="w-full bg-[#dff66c] text-[#173b35] hover:bg-[#d3f15d]">Salvar empresa e funcionários</Button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

