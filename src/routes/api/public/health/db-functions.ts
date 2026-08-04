import { createFileRoute } from "@tanstack/react-router";

interface FunctionCheck {
  schema_name: string;
  function_name: string;
  arguments: string;
  status: string;
  detail: string;
}

async function runCheck(source: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const client = supabaseAdmin as unknown as {
    rpc: (name: string) => Promise<{ data: FunctionCheck[] | null; error: { message: string } | null }>;
    from: (table: string) => {
      insert: (values: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
  };

  const { data, error } = await client.rpc("check_system_functions");
  if (error) {
    return Response.json(
      { ok: false, checkedAt: new Date().toISOString(), total: 0, error: error.message, failures: [] },
      { status: 503 },
    );
  }

  const rows = data ?? [];
  const failures = rows.filter((row) => row.status !== "ok");
  const ok = failures.length === 0;

  await client.from("system_health_checks").insert({
    source,
    passed: ok,
    total: rows.length,
    failures,
  });

  return Response.json(
    { ok, checkedAt: new Date().toISOString(), total: rows.length, failures },
    { status: ok ? 200 : 503 },
  );
}

export const Route = createFileRoute("/api/public/health/db-functions")({
  server: {
    handlers: {
      GET: async () => runCheck("http"),
      POST: async ({ request }) => {
        let source = "cron";
        try {
          const body = (await request.json()) as { source?: unknown };
          if (typeof body.source === "string" && body.source.length <= 32) source = body.source;
        } catch {
          // corpo opcional
        }
        return runCheck(source);
      },
    },
  },
});
