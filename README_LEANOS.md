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

Cada empresa tem um registro separado. Trocar de conta ou acessar o ADM não apaga registros. O ADM mantém os dados demonstrativos originais. Dados de empresas do formato anterior são lidos e migrados ao entrar, sem exclusão dos registros antigos.

Novas senhas são armazenadas como hashes com salt; contas antigas são convertidas no próximo login. A autenticação continua sendo local: o MVP não substitui autenticação e autorização em servidor. Limpar o armazenamento do navegador ainda remove os dados locais.

Para começar em uma empresa: cadastre funcionários, crie um processo com etapas e depois adicione tarefas, medições e planos de melhoria. A tela de tarefas permite concluir ações; os planos permitem atualizar a situação e informar o resultado posterior.

## Verificação

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Os testes de componentes usam DOM simulado, sem acessar contas ou dados reais. Com a versão instalada do JSDOM, use Node.js 22.22.2+, 24.15+ ou 26+ para executar os testes.
