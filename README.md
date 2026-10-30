# PCP 360° · Gestão Inteligente de Oficina

Torre de controle para a oficina: recebe as OS, classifica a prioridade (P1/P2/P3), sugere o mecânico e o box pelo score de matching, acompanha a execução e gera alertas e KPIs.

Stack: Next.js 15 (App Router) + TypeScript + Tailwind 4 + Supabase. Deploy na Vercel.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem variáveis do Supabase, o sistema sobe em **modo demo**, com 8 boxes, 8 mecânicos, fila, OS em execução e 7 dias de histórico fictícios em memória. Os dados voltam ao estado inicial quando o servidor reinicia (ou pelo botão em Configurações).

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Ambiente de desenvolvimento |
| `npm test` | Testes das regras de negócio e casos de uso (Vitest) |
| `npm run typecheck` | Checagem de tipos |
| `npm run build` | Build de produção |

## Telas

| Rota | Módulo |
| --- | --- |
| `/` | Dashboard: KPIs, fila priorizada com sugestão, gargalos, alertas, boxes |
| `/os` | Fila, OS em andamento e concluídas |
| `/os/[id]` | Detalhe da OS: ranking de candidatos com score, justificativa, aprovação e execução |
| `/os/importar` | Importação CSV com validação (exemplo em `public/exemplo-os.csv`) |
| `/boxes` | Status dos boxes, cadastro, manutenção |
| `/mecanicos` | Matriz de skills, presença no turno, cadastro |
| `/analytics` | Lead/Touch/Waiting Time, FTR, Plano Ouro, produtividade por box e por mecânico |
| `/alertas` | Alertas preditivos (SLA em risco, box parado, Plano Ouro, peça indisponível) |
| `/tv` | Painel TV do chão de oficina (atualiza a cada 15 s) |

## Arquitetura em camadas

```
src/
├── app/                 Rotas Next e server actions (entrada da camada de apresentação)
├── presentation/        Componentes de UI
├── application/         Casos de uso, DTOs e serviços (CSV)
├── domain/              Entidades, regras de negócio, contratos de repositório
├── infrastructure/      Supabase, repositório em memória, IA, container de dependências
├── shared/              Constantes, parâmetros e utilitários
└── tests/
```

Casos de uso: `ImportOSUseCase`, `CalculatePriorityUseCase`, `AssignTechnicianUseCase`, `ReorganizeQueueUseCase`, `GenerateAlertsUseCase`, `ExecuteWorkOrderUseCase`, `GetDashboardUseCase`.

## Regras implementadas

- **Prioridade:** Plano Ouro ou carga sensível = P1; corretiva, diagnóstico ou SLA próximo = P2; revisão/preventiva = P3. Recalculada a cada leitura.
- **Elegibilidade:** Assistente só faz baixa complexidade (Regra 03); JR até média (Regra 04); diagnóstico pesa a favor de Pleno/SR (Regra 05); box ocupado ou em manutenção fica fora (Regra 06); mecânico ausente fica fora.
- **Score (0–100):** SLA 50%, disponibilidade 20%, skill match 20%, certificação 5%, produtividade 5%. Cálculo em `src/domain/rules/matching.ts`.
- **Fila reorganizada:** a sugestão é simulada em sequência, então duas OS não recebem o mesmo box nem disputam o mesmo horário do mecânico.

Parâmetros (pesos, limites de alerta, turno) ficam em `src/shared/constants/index.ts`.

## Ligar no Supabase

1. Crie um projeto no Supabase e rode `supabase/migrations/0001_init.sql` no SQL Editor.
2. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` (chave secreta `sb_secret_...`; a `SUPABASE_SERVICE_ROLE_KEY` legada também é aceita).
3. Reinicie `npm run dev`. A barra lateral passa a mostrar "Dados: Supabase".
4. Cadastre boxes e mecânicos pelas telas e importe as OS por CSV.

A migração acrescenta ao schema da especificação os campos que os KPIs e as regras exigem (chegada, início, fim, retrabalho, skill exigida, certificação, peça indisponível etc.), todos marcados com `[+]` no SQL.

## Deploy (Vercel)

1. `git push` para um repositório no GitHub.
2. Na Vercel: Import Project → selecione o repositório → configure as variáveis de ambiente → Deploy.

Na Vercel o modo demo não persiste dados entre instâncias. Use o Supabase em qualquer ambiente compartilhado.

## Pendências conhecidas (próximas fases)

- Login e perfis (PCP, Supervisor, Mecânico, Gestor) com Supabase Auth e RLS por papel. Hoje não há autenticação.
- Supabase Realtime no Painel TV (hoje atualiza a cada 15 s).
- Provedor de IA generativa (Claude/OpenAI/Azure/Gemini) para justificativas e análise de gargalos em linguagem natural. Hoje a justificativa é determinística, gerada a partir do score.
- Edição dos parâmetros pela tela de Configurações.
- Horário do turno usa o fuso do servidor. Na Vercel (UTC), ajustar para America/Sao_Paulo.
