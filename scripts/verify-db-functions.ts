/**
 * Verificação automática das funções do banco.
 * Uso: bun run verify:db  (opcional: VERIFY_DB_URL=https://... )
 */
const base =
  process.env["VERIFY_DB_URL"] ??
  "https://project--f5497ed2-ab98-41ba-bc2f-13bee16cc0b5.lovable.app";

const url = `${base.replace(/\/$/, "")}/api/public/health/db-functions`;

interface CheckResponse {
  ok: boolean;
  total: number;
  checkedAt: string;
  error?: string;
  failures: { schema_name: string; function_name: string; status: string; detail: string }[];
}

const response = await fetch(url, { method: "GET" });
const payload = (await response.json()) as CheckResponse;

if (payload.ok) {
  console.log(`OK — ${payload.total} funções verificadas (${payload.checkedAt}).`);
  process.exit(0);
}

console.error(`FALHA — ${payload.failures.length} divergência(s) de ${payload.total} funções.`);
if (payload.error) console.error(`Erro: ${payload.error}`);
for (const failure of payload.failures) {
  console.error(`- ${failure.schema_name}.${failure.function_name}: ${failure.status} — ${failure.detail}`);
}
process.exit(1);
