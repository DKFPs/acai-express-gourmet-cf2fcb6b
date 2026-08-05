import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { friendlyError } from "@/lib/errors";
import { MissingToolsTablesError, toolsService } from "@/services/tools.service";
import type { TaskInput } from "@/types/tools";

function notify(error: unknown) {
  if (error instanceof MissingToolsTablesError) {
    toast.error(error.message);
    return;
  }
  toast.error(friendlyError(error));
}

export function useReminders() {
  return useQuery({
    queryKey: ["reminders"],
    queryFn: () => toolsService.listReminders(),
    retry: false,
  });
}

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => toolsService.listTasks(),
    retry: false,
  });
}

export function useReminderMutations() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["reminders"] });

  const create = useMutation({
    mutationFn: (title: string) =>
      toolsService.createReminder(title, profile?.company_id ?? null, user?.id ?? null),
    onSuccess: () => {
      toast.success("Lembrete adicionado.");
      invalidate();
    },
    onError: notify,
  });

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      toolsService.toggleReminder(id, done),
    onSuccess: invalidate,
    onError: notify,
  });

  const remove = useMutation({
    mutationFn: (id: string) => toolsService.removeReminder(id),
    onSuccess: () => {
      toast.success("Lembrete removido.");
      invalidate();
    },
    onError: notify,
  });

  return { create, toggle, remove };
}

export function useTaskMutations() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

  const create = useMutation({
    mutationFn: (input: TaskInput) =>
      toolsService.createTask(input, profile?.company_id ?? null, user?.id ?? null),
    onSuccess: () => {
      toast.success("Tarefa criada.");
      invalidate();
    },
    onError: notify,
  });

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => toolsService.toggleTask(id, done),
    onSuccess: invalidate,
    onError: notify,
  });

  const remove = useMutation({
    mutationFn: (id: string) => toolsService.removeTask(id),
    onSuccess: () => {
      toast.success("Tarefa removida.");
      invalidate();
    },
    onError: notify,
  });

  return { create, toggle, remove };
}
