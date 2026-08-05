import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";

import { friendlyError } from "@/lib/errors";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/layouts/auth-layout";
import { authService } from "@/services/auth.service";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Açaí Express Manager" },
      { name: "description", content: "Acesse o painel de gestão do Açaí Express Manager." },
      { property: "og:title", content: "Entrar — Açaí Express Manager" },
      { property: "og:description", content: "Acesse o painel de gestão do Açaí Express Manager." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) void navigate({ to: "/dashboard", replace: true });
  }, [loading, isAuthenticated, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error } = await authService.signIn(email, password);
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        void navigate({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await authService.signUp(email, password, fullName);
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada com sucesso!");
          void navigate({ to: "/dashboard", replace: true });
        } else {
          toast.success("Confirme seu e-mail para ativar a conta.");
          setMode("login");
        }
      }
    } catch (error) {
      toast.error(friendlyError(error, "Não foi possível continuar."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={mode === "login" ? "Entrar no sistema" : "Criar conta"}
      subtitle={
        mode === "login"
          ? "Gerencie sua operação com agilidade e controle."
          : "Cadastre-se para acessar o painel de gestão."
      }
      footer={
        <button
          type="button"
          className="font-medium text-gold transition-opacity hover:opacity-80"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Seu nome"
                className="h-11 pl-10"
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com"
              className="h-11 pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            {mode === "login" && (
              <Link
                to="/recuperar-senha"
                className="text-xs font-medium text-gold transition-opacity hover:opacity-80"
              >
                Esqueci minha senha
              </Link>
            )}
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="h-11 pl-10"
              minLength={6}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-xl text-sm font-semibold"
          disabled={submitting}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "login" ? "Entrar" : "Criar conta"}
        </Button>
      </form>
    </AuthLayout>
  );
}
