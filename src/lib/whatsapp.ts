import type { CompanySettings } from "@/types/saas";

export function digitsOnly(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function buildWhatsappLink(phone: string | null | undefined, message: string): string {
  const number = digitsOnly(phone);
  const normalized = number.length > 0 && !number.startsWith("55") ? `55${number}` : number;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export interface OrderMessageContext {
  cliente: string;
  numero: string | number;
  status: string;
  total: string;
  empresa: string;
}

export function renderTemplate(template: string, context: OrderMessageContext): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) =>
    String(context[key as keyof OrderMessageContext] ?? ""),
  );
}

export function orderWhatsappLink(
  settings: CompanySettings | null | undefined,
  phone: string | null | undefined,
  context: OrderMessageContext,
): string {
  const template = settings?.whatsapp_template ?? "Olá {cliente}! Seu pedido #{numero} está {status}.";
  return buildWhatsappLink(phone, renderTemplate(template, context));
}
