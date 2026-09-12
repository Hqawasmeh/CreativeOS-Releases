# Qanteak AI architecture

Qanteak AI is an agent over the Qanteak workspace, not a keyword search layer.

## Modes
- **Ask**: reason over connected workspace context.
- **Do**: prepare safe workspace actions for explicit approval.
- **Watch**: prepare monitoring/automation rules.

## Trust boundary
The desktop sends the minimum useful structured workspace context through the authenticated Electron backend to the `qanteak-ai` Supabase Edge Function. The model provider key exists only as the Edge Function secret `OPENAI_API_KEY`. The language model never receives direct database write credentials and never mutates workspace data directly.

Every write returned by the model is a proposal. Qanteak validates the tool name, applies normal workspace permission checks, shows the proposed action, and executes it only after the user confirms.

## Finance
Qanteak code calculates invoice totals, outstanding balances, overdue balances, expenses and paid revenue. The AI may explain those deterministic values but must not invent financial totals.

## Initial tools
`create_task`, `update_task`, `create_project`, `create_document`, `draft_invoice`, `create_reminder`, `create_automation`.

External, destructive and money-moving actions remain disabled in V0.20.
