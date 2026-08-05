/**
 * Tradução central de erros técnicos (Supabase/PostgREST/rede) para mensagens
 * amigáveis em português. Use em todos os hooks e formulários.
 */

type MaybeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

const CODE_MESSAGES: Record<string, string> = {
  "23505": "Já existe um registro com estes dados.",
  "23503": "Este registro está vinculado a outros dados e não pode ser removido.",
  "23502": "Preencha todos os campos obrigatórios.",
  "22P02": "Algum valor informado está em formato inválido.",
  "42501": "Você não tem permissão para esta ação.",
  PGRST116: "Registro não encontrado.",
  PGRST301: "Sua sessão expirou. Entre novamente para continuar.",
};

const PATTERNS: { test: RegExp; message: string }[] = [
  {
    test: /row-level security|permission denied|not authorized|42501/i,
    message: "Você não tem permissão para esta ação.",
  },
  {
    test: /duplicate key|already (registered|exists)/i,
    message: "Já existe um registro com estes dados.",
  },
  {
    test: /foreign key/i,
    message: "Este registro está vinculado a outros dados e não pode ser removido.",
  },
  {
    test: /failed to fetch|network ?error|load failed/i,
    message: "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
  },
  { test: /timeout|timed out/i, message: "A operação demorou demais. Tente novamente." },
  {
    test: /jwt|invalid token|session/i,
    message: "Sua sessão expirou. Entre novamente para continuar.",
  },
  { test: /invalid login credentials/i, message: "E-mail ou senha incorretos." },
  { test: /email not confirmed/i, message: "Confirme seu e-mail para acessar a conta." },
  { test: /user already registered/i, message: "Este e-mail já possui uma conta." },
  { test: /password should be at least/i, message: "A senha precisa ter pelo menos 6 caracteres." },
  {
    test: /relation .* does not exist/i,
    message: "Uma tabela necessária ainda não existe no banco de dados.",
  },
];

export function friendlyError(
  error: unknown,
  fallback = "Não foi possível concluir a operação. Tente novamente.",
): string {
  if (!error) return fallback;
  if (typeof error === "string") return matchMessage(error) ?? error;

  const candidate = error as MaybeError;
  const byCode = candidate.code ? CODE_MESSAGES[candidate.code] : undefined;
  if (byCode) return byCode;

  const raw = candidate.message ?? (error instanceof Error ? error.message : "");
  if (!raw) return fallback;
  return matchMessage(raw) ?? raw;
}

function matchMessage(raw: string): string | null {
  const found = PATTERNS.find((pattern) => pattern.test.test(raw));
  return found?.message ?? null;
}
