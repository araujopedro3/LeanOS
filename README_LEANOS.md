# LeanOS Código Fonte

Este pacote contém o código completo do MVP do LeanOS.

## Requisitos

- Node.js 22.13 ou superior
- pnpm

## Executar localmente

```bash
pnpm install
pnpm dev
```

Depois, abra o endereço exibido pelo terminal.

## Gerar versão de produção

```bash
pnpm build
```

## Estrutura principal

- `app/` — página principal, layout e estilos globais
- `components/leanos/` — componentes funcionais do sistema
- `components/ui/` — componentes de interface reutilizáveis
- `lib/leanos-data.ts` — modelos, dados demonstrativos e cálculos Lean
- `public/` — arquivos públicos e favicon

## Persistência do MVP

Os processos, tarefas, medições e planos criados são armazenados localmente no navegador. A documentação do projeto mantém backend, banco em nuvem e sincronização entre dispositivos como evolução posterior ao MVP.
