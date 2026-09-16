# 🌿 LeanOS

<p align="center">
  <strong>Gestão visual de processos e melhoria contínua</strong><br>
  Organize processos, identifique gargalos e acompanhe resultados em um único lugar.
</p>

<p align="center">
  <a href="https://leanos-rust.vercel.app/"><strong>🚀 ACESSAR O LEANOS ONLINE</strong></a>
</p>

<p align="center">
  <a href="#-funcionalidades">Funcionalidades</a> ·
  <a href="#-como-executar">Como executar</a> ·
  <a href="#-equipe">Equipe</a>
</p>

---

## 🌐 Acesse o projeto

### [👉 Abrir LeanOS: https://leanos-rust.vercel.app/](https://leanos-rust.vercel.app/)

A versão pública está hospedada na **Vercel** e pode ser acessada pelo navegador, no computador ou no celular.

## 💡 Sobre o projeto

O **LeanOS** é uma aplicação web para apoiar equipes na gestão de processos e na melhoria contínua. A plataforma reúne medições operacionais, indicadores e planos de ação para ajudar a identificar gargalos e acompanhar os resultados das melhorias.

Desenvolvido como um **MVP acadêmico do Projeto Integrador**, o sistema transforma os registros de tempo em informações para orientar decisões da equipe.

## ✨ Funcionalidades

| Área | O que você encontra |
| --- | --- |
| 📊 Dashboard | Visão geral dos processos, indicadores, alertas e atividades |
| 🔄 Processos | Cadastro de fluxos e etapas, responsáveis, prazos e prioridades |
| ⏱️ Medições | Registro de início e término com cálculo automático da duração |
| ✅ Tarefas | Acompanhamento de ações, status e progresso |
| 💡 Melhorias | Planos com problema, ação proposta e comparação antes/depois |
| 📈 Indicadores | Tempos médio, mínimo e máximo por etapa |
| 👥 Equipe | Integrantes e responsabilidades no projeto |

A interface se adapta a diferentes tamanhos de tela. Relatórios gerenciais e exportações estão previstos como evolução do MVP.

## 🛠️ Tecnologias

- **React e TypeScript** — interface e organização do código
- **Next.js** — build de produção na Vercel
- **Vinext e Vite** — ambiente de desenvolvimento local
- **Tailwind CSS e Radix UI** — estilos e componentes de interface
- **Recharts** — gráficos e visualização de indicadores
- **pnpm** — gerenciamento de dependências

## ▶️ Como executar

### Pré-requisitos

- Node.js **22.13 ou superior**
- pnpm
- Git

### Instalação e desenvolvimento

```bash
git clone https://github.com/araujopedro3/LeanOS.git
cd LeanOS
pnpm install
pnpm dev
```

Abra **http://localhost:5173** no navegador.

### Build usado na Vercel

```bash
pnpm exec next build
```

O arquivo `vercel.json` configura o build com Next.js e a saída `.next`. A Vercel está conectada a este repositório: novos commits na branch `main` iniciam uma publicação automática, que substitui a versão pública quando o build termina com sucesso.

## 📁 Estrutura do projeto

```text
app/                  Páginas, layout e estilos globais
components/leanos/    Interface e funcionalidades do LeanOS
components/ui/       Componentes reutilizáveis
lib/                 Modelos e dados demonstrativos
public/              Arquivos públicos e ícones
build/               Integração do ambiente original de hospedagem
scripts/             Scripts de desenvolvimento e build
vercel.json          Configuração de publicação na Vercel
```

## 💾 Armazenamento dos dados

No MVP, processos, tarefas, medições e planos de melhoria são armazenados no **localStorage do navegador**. Os registros ficam no dispositivo e navegador utilizados e não são sincronizados entre computadores.

API, banco de dados e sincronização entre usuários podem fazer parte de uma próxima etapa do projeto.

## 👥 Equipe

| Integrante | Responsabilidade |
| --- | --- |
| **Adryan** | Product Owner / Front-end |
| **Cleberson** | UX/UI |
| **Eyshila** | Analista de Requisitos |
| **Gustavo** | Back-end |
| **Nicollas Matheus** | QA / Testes |
| **Pedro Araujo** | DevOps |
| **Rayssa Couto** | Dados / DBA |
| **Yuri** | Documentação |

## 📌 Status

**MVP funcional em desenvolvimento.**

Sugestões e problemas podem ser registrados nas [Issues do repositório](https://github.com/araujopedro3/LeanOS/issues).

---

<p align="center">
  <strong>LeanOS · Melhoria contínua orientada por dados</strong><br>
  <a href="https://leanos-rust.vercel.app/">🌐 Acesse a versão online</a>
</p>
