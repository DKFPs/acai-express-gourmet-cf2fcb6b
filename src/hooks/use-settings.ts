import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { friendlyError } from "@/lib/errors";

import { useAuth } from "@/hooks/use-auth";
import { settingsService } from "@/services/settings.service";
import type { CompanyMember, CompanySettings } from "@/types/saas";
import type { Company } from "@/types";

export function useCompanySettings() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;

  return useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: () => settingsService.getSettings(companyId as string),
    enabled: Boolean(companyId),
  });
}

export function useCompany() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;

  return useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const { profileService } = await import("@/services/profile.service");
      return profileService.getCompany(companyId as string);
    },
    enabled: Boolean(companyId),
  });
}

export function useSaveSettings() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Partial<CompanySettings>) =>
      settingsService.upsertSettings(companyId as string, values),
    onSuccess: () => {
      toast.success("Configurações salvas");
      void queryClient.invalidateQueries({ queryKey: ["company-settings", companyId] });
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });
}

export function useSaveCompany() {
  const { profile, refreshProfile } = useAuth();
  const companyId = profile?.company_id ?? null;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Partial<Company>) =>
      settingsService.updateCompany(companyId as string, values),
    onSuccess: async () => {
      toast.success("Dados da empresa atualizados");
      await refreshProfile();
      void queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });
}

export function useMembers() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;

  return useQuery({
    queryKey: ["company-members", companyId],
    queryFn: () => settingsService.listMembers(companyId as string),
    enabled: Boolean(companyId),
  });
}

export function useMemberMutations() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["company-members", companyId] });

  const setRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: CompanyMember["role"] }) =>
      settingsService.setMemberRole(userId, role),
    onSuccess: () => {
      toast.success("Permissão atualizada");
      void invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const setActive = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      settingsService.setMemberActive(userId, isActive),
    onSuccess: () => {
      toast.success("Usuário atualizado");
      void invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  return { setRole, setActive };
}
