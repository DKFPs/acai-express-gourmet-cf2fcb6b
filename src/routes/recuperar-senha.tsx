import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/layouts/auth-layout";
import { authService } from "@/services/auth.service";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Açaí Express Manager" },
      { name: "description", content: "Receba um link seguro para redefinir a senha da sua conta." },
      { property: "og:title", content: "Recuperar senha — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Receba um link seguro para redefinir a senha da sua conta.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await authService.requestPasswordReset(email);
      if (error) throw error;
      setSent(true);
      toast.success("Enviamos um link de recuperação para o seu e-mail.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o e-mail.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe seu e-mail e enviaremos um link para criar uma nova senha."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-gold">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-border/60 bg-secondary/40 p-5 text-center text-sm text-muted-foreground">
          Se existir uma conta para <span className="font-medium text-foreground">{email}</span>, o
          link de recuperação chegará em instantes.
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail cadastrado</Label>
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
          <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar link de recuperação
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
