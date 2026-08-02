import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useMemberMutations, useMembers } from "@/hooks/use-settings";
import { usePermissions } from "@/hooks/use-permissions";
import { KEYBOARD_SHORTCUTS } from "@/hooks/use-shortcuts";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
  head: () => ({
    meta: [
      { title: "Usuários e permissões | Gestão SaaS" },
      {
        name: "description",
        content:
          "Gerencie a equipe da empresa, defina papéis de administrador ou funcionário e ative ou desative acessos.",
      },
      { property: "og:title", content: "Usuários e permissões | Gestão SaaS" },
      {
        property: "og:description",
        content: "Controle de acesso por papel com ativação de usuários e atalhos de produtividade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function UsuariosPage() {
  const { can } = usePermissions();
  const { user } = useAuth();
  const { data, isLoading } = useMembers();
  const { setRole, setActive } = useMemberMutations();

  if (!can("users.manage")) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Apenas administradores podem gerenciar usuários.
          </CardContent>
        </Card>
      </div>
    );
  }

  const members = data ?? [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Users className="h-6 w-6 text-primary" /> Usuários
        </h1>
        <p className="text-sm text-muted-foreground">Equipe com acesso ao sistema da sua empresa.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipe</CardTitle>
          <CardDescription>
            Administradores têm acesso total. Funcionários não acessam auditoria, configurações e exclusões.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.full_name || "Sem nome"}
                        {member.id === user?.id && (
                          <Badge variant="secondary" className="ml-2">
                            você
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{member.phone ?? "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            setRole.mutate({ userId: member.id, role: value as typeof member.role })
                          }
                          disabled={member.id === user?.id}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administrador">Administrador</SelectItem>
                            <SelectItem value="funcionario">Funcionário</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={member.is_active}
                          disabled={member.id === user?.id}
                          onCheckedChange={(checked) =>
                            setActive.mutate({ userId: member.id, isActive: checked })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Atalhos de teclado
          </CardTitle>
          <CardDescription>Use Ctrl/Cmd + K para a pesquisa global.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.to}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span>{shortcut.label}</span>
              <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">
                Alt + {shortcut.keys.toUpperCase()}
              </kbd>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
