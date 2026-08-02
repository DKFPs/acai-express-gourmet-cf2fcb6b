import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Clock,
  Database,
  Download,
  Loader2,
  MessageCircle,
  Truck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useCompany, useCompanySettings, useSaveCompany, useSaveSettings } from "@/hooks/use-settings";
import { settingsService } from "@/services/settings.service";
import { backupSummary, collectBackup, downloadBackupExcel, downloadBackupJson } from "@/lib/backup";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { PAYMENT_METHOD_LABELS, WEEK_DAYS, type OpeningHours } from "@/types/saas";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
  head: () => ({
    meta: [
      { title: "Configurações da empresa | Gestão SaaS" },
      {
        name: "description",
        content:
          "Configure logo, horário de funcionamento, taxa de entrega, formas de pagamento, integração WhatsApp e backup dos dados da empresa.",
      },
      { property: "og:title", content: "Configurações da empresa | Gestão SaaS" },
      {
        property: "og:description",
        content: "Personalize identidade, entrega, pagamentos, WhatsApp e backup da sua operação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ConfiguracoesPage() {
  const { can } = usePermissions();
  const { profile } = useAuth();
  const { data: settings, isLoading } = useCompanySettings();
  const { data: company } = useCompany();
  const saveSettings = useSaveSettings();
  const saveCompany = useSaveCompany();

  const [companyForm, setCompanyForm] = useState({ name: "", document: "", phone: "", email: "", address: "" });
  const [hours, setHours] = useState<OpeningHours>({});
  const [delivery, setDelivery] = useState({ fee: "0", free: "", min: "0" });
  const [methods, setMethods] = useState<string[]>([]);
  const [whats, setWhats] = useState({ number: "", template: "", enabled: true });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name ?? "",
        document: company.document ?? "",
        phone: company.phone ?? "",
        email: company.email ?? "",
        address: company.address ?? "",
      });
    }
  }, [company]);

  useEffect(() => {
    if (!settings) return;
    setHours((settings.opening_hours ?? {}) as OpeningHours);
    setDelivery({
      fee: String(settings.delivery_fee ?? 0),
      free: settings.free_delivery_above == null ? "" : String(settings.free_delivery_above),
      min: String(settings.min_order_value ?? 0),
    });
    setMethods(settings.payment_methods ?? []);
    setWhats({
      number: settings.whatsapp_number ?? "",
      template: settings.whatsapp_template ?? "",
      enabled: settings.whatsapp_enabled,
    });
    setLogoUrl(settings.logo_url);
  }, [settings]);

  if (!can("settings.manage")) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Apenas administradores podem acessar as configurações da empresa.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const handleLogo = async (file: File) => {
    if (!profile?.company_id) return;
    setUploading(true);
    try {
      const url = await settingsService.uploadLogo(profile.company_id, file);
      setLogoUrl(url);
      saveSettings.mutate({ logo_url: url });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Identidade, operação e integrações da sua empresa.
        </p>
      </header>

      <Tabs defaultValue="empresa" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="h-4 w-4" /> Empresa
          </TabsTrigger>
          <TabsTrigger value="horario" className="gap-2">
            <Clock className="h-4 w-4" /> Horário
          </TabsTrigger>
          <TabsTrigger value="entrega" className="gap-2">
            <Truck className="h-4 w-4" /> Entrega e pagamentos
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Database className="h-4 w-4" /> Backup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Dados da empresa</CardTitle>
              <CardDescription>Informações usadas em relatórios, recibos e mensagens.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border border-border bg-muted">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo da empresa" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Label htmlFor="logo" className="mb-2 block text-sm">
                    Logo da empresa
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      className="max-w-64"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleLogo(file);
                      }}
                    />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {!uploading && <Upload className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome" value={companyForm.name} onChange={(v) => setCompanyForm({ ...companyForm, name: v })} />
                <Field label="CNPJ / CPF" value={companyForm.document} onChange={(v) => setCompanyForm({ ...companyForm, document: v })} />
                <Field label="Telefone" value={companyForm.phone} onChange={(v) => setCompanyForm({ ...companyForm, phone: v })} />
                <Field label="E-mail" value={companyForm.email} onChange={(v) => setCompanyForm({ ...companyForm, email: v })} />
              </div>
              <Field label="Endereço" value={companyForm.address} onChange={(v) => setCompanyForm({ ...companyForm, address: v })} />

              <Button
                onClick={() =>
                  saveCompany.mutate({
                    name: companyForm.name,
                    document: companyForm.document || null,
                    phone: companyForm.phone || null,
                    email: companyForm.email || null,
                    address: companyForm.address || null,
                  })
                }
                disabled={saveCompany.isPending}
              >
                {saveCompany.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar dados
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="horario">
          <Card>
            <CardHeader>
              <CardTitle>Horário de funcionamento</CardTitle>
              <CardDescription>Defina os horários de atendimento por dia da semana.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {WEEK_DAYS.map((day) => {
                const value = hours[day.key] ?? { open: "09:00", close: "18:00", closed: false };
                return (
                  <div key={day.key} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
                    <span className="w-24 text-sm font-medium">{day.label}</span>
                    <Switch
                      checked={!value.closed}
                      onCheckedChange={(checked) =>
                        setHours({ ...hours, [day.key]: { ...value, closed: !checked } })
                      }
                    />
                    <span className="w-16 text-xs text-muted-foreground">
                      {value.closed ? "Fechado" : "Aberto"}
                    </span>
                    <Input
                      type="time"
                      className="w-32"
                      value={value.open}
                      disabled={value.closed}
                      onChange={(event) => setHours({ ...hours, [day.key]: { ...value, open: event.target.value } })}
                    />
                    <span className="text-muted-foreground">às</span>
                    <Input
                      type="time"
                      className="w-32"
                      value={value.close}
                      disabled={value.closed}
                      onChange={(event) => setHours({ ...hours, [day.key]: { ...value, close: event.target.value } })}
                    />
                  </div>
                );
              })}
              <Button onClick={() => saveSettings.mutate({ opening_hours: hours })} disabled={saveSettings.isPending}>
                Salvar horários
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entrega">
          <Card>
            <CardHeader>
              <CardTitle>Entrega e pagamentos</CardTitle>
              <CardDescription>Taxas aplicadas aos pedidos e formas de pagamento aceitas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Taxa de entrega (R$)" type="number" value={delivery.fee} onChange={(v) => setDelivery({ ...delivery, fee: v })} />
                <Field label="Entrega grátis acima de (R$)" type="number" value={delivery.free} onChange={(v) => setDelivery({ ...delivery, free: v })} />
                <Field label="Pedido mínimo (R$)" type="number" value={delivery.min} onChange={(v) => setDelivery({ ...delivery, min: v })} />
              </div>

              <div className="space-y-2">
                <Label>Formas de pagamento</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => {
                    const active = methods.includes(key);
                    return (
                      <Button
                        key={key}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        className="rounded-full"
                        onClick={() =>
                          setMethods(active ? methods.filter((m) => m !== key) : [...methods, key])
                        }
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={() =>
                  saveSettings.mutate({
                    delivery_fee: Number(delivery.fee) || 0,
                    free_delivery_above: delivery.free === "" ? null : Number(delivery.free),
                    min_order_value: Number(delivery.min) || 0,
                    payment_methods: methods,
                  })
                }
                disabled={saveSettings.isPending}
              >
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>Integração WhatsApp</CardTitle>
              <CardDescription>
                Envio por link direto (wa.me) — sem custo e sem verificação de conta comercial.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch checked={whats.enabled} onCheckedChange={(v) => setWhats({ ...whats, enabled: v })} />
                <span className="text-sm">Exibir botões de WhatsApp no sistema</span>
              </div>
              <Field
                label="Número da empresa (com DDD)"
                value={whats.number}
                onChange={(v) => setWhats({ ...whats, number: v })}
              />
              <div className="space-y-2">
                <Label>Mensagem padrão</Label>
                <Textarea
                  rows={3}
                  value={whats.template}
                  onChange={(event) => setWhats({ ...whats, template: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: {"{cliente}"}, {"{numero}"}, {"{status}"}, {"{total}"}, {"{empresa}"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    saveSettings.mutate({
                      whatsapp_number: whats.number || null,
                      whatsapp_template: whats.template,
                      whatsapp_enabled: whats.enabled,
                    })
                  }
                  disabled={saveSettings.isPending}
                >
                  Salvar integração
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(buildWhatsappLink(whats.number, "Teste de integração do sistema."), "_blank")
                  }
                  disabled={!whats.number}
                >
                  Testar link
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <BackupPanel companyName={company?.name ?? "empresa"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function BackupPanel({ companyName }: { companyName: string }) {
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ table: string; count: number }[]>([]);

  const run = async (format: "json" | "xlsx") => {
    setRunning(true);
    try {
      const data = await collectBackup(setCurrent);
      setSummary(backupSummary(data));
      if (format === "json") downloadBackupJson(data, companyName);
      else await downloadBackupExcel(data, companyName);
      toast.success("Backup gerado com sucesso");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRunning(false);
      setCurrent(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup dos dados</CardTitle>
        <CardDescription>
          Exporte todos os dados da empresa em um único arquivo. O banco de dados também possui backup
          gerenciado automaticamente pela infraestrutura.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void run("xlsx")} disabled={running}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Baixar Excel
          </Button>
          <Button variant="outline" onClick={() => void run("json")} disabled={running}>
            <Download className="mr-2 h-4 w-4" /> Baixar JSON
          </Button>
        </div>
        {current && <p className="text-sm text-muted-foreground">Exportando: {current}...</p>}
        {summary.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {summary.map((row) => (
              <div key={row.table} className="flex justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">{row.table}</span>
                <span className="font-medium">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
