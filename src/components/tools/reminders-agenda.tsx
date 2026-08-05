import { useState } from "react";
import { CalendarDays, Bell, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useReminderMutations, useReminders, useTaskMutations, useTasks } from "@/hooks/use-tools";
import type { TaskPriority } from "@/types/tools";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
};

function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
      {error instanceof Error ? error.message : "Não foi possível carregar os dados."}
    </p>
  );
}

export function RemindersAgenda() {
  const reminders = useReminders();
  const tasks = useTasks();
  const reminderMutations = useReminderMutations();
  const taskMutations = useTaskMutations();

  const [reminderTitle, setReminderTitle] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("normal");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Lembretes rápidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!reminderTitle.trim()) return;
              reminderMutations.create.mutate(reminderTitle, {
                onSuccess: () => setReminderTitle(""),
              });
            }}
          >
            <Input
              value={reminderTitle}
              maxLength={160}
              placeholder="Ex.: comprar potes de 500ml"
              onChange={(event) => setReminderTitle(event.target.value)}
            />
            <Button type="submit" disabled={reminderMutations.create.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>

          <ErrorNote error={reminders.error} />

          <ul className="space-y-2">
            {(reminders.data ?? []).map((reminder) => (
              <li
                key={reminder.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3"
              >
                <Checkbox
                  checked={reminder.done}
                  onCheckedChange={(checked) =>
                    reminderMutations.toggle.mutate({ id: reminder.id, done: checked === true })
                  }
                />
                <span
                  className={`flex-1 text-sm ${reminder.done ? "text-muted-foreground line-through" : ""}`}
                >
                  {reminder.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => reminderMutations.remove.mutate(reminder.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
            {!reminders.isLoading && (reminders.data ?? []).length === 0 && !reminders.error ? (
              <li className="py-6 text-center text-sm text-muted-foreground">
                Nenhum lembrete por aqui.
              </li>
            ) : null}
          </ul>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            Agenda de tarefas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!taskTitle.trim()) return;
              taskMutations.create.mutate(
                {
                  title: taskTitle,
                  notes: taskNotes.trim() ? taskNotes.trim() : null,
                  due_date: taskDate || null,
                  priority: taskPriority,
                },
                {
                  onSuccess: () => {
                    setTaskTitle("");
                    setTaskNotes("");
                    setTaskDate("");
                    setTaskPriority("normal");
                  },
                },
              );
            }}
          >
            <Input
              value={taskTitle}
              maxLength={160}
              placeholder="Tarefa (ex.: produzir lote de morango)"
              onChange={(event) => setTaskTitle(event.target.value)}
            />
            <Textarea
              value={taskNotes}
              rows={2}
              placeholder="Observações (opcional)"
              onChange={(event) => setTaskNotes(event.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  value={taskDate}
                  onChange={(event) => setTaskDate(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prioridade</Label>
                <Select
                  value={taskPriority}
                  onValueChange={(value) => setTaskPriority(value as TaskPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={taskMutations.create.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar tarefa
            </Button>
          </form>

          <ErrorNote error={tasks.error} />

          <ul className="space-y-2">
            {(tasks.data ?? []).map((task) => (
              <li
                key={task.id}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3"
              >
                <Checkbox
                  className="mt-1"
                  checked={task.done}
                  onCheckedChange={(checked) =>
                    taskMutations.toggle.mutate({ id: task.id, done: checked === true })
                  }
                />
                <div className="flex-1">
                  <p className={`text-sm ${task.done ? "text-muted-foreground line-through" : ""}`}>
                    {task.title}
                  </p>
                  {task.notes ? (
                    <p className="text-xs text-muted-foreground">{task.notes}</p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {task.due_date ? (
                      <Badge variant="outline">
                        {new Date(`${task.due_date}T00:00:00`).toLocaleDateString("pt-BR")}
                      </Badge>
                    ) : null}
                    <Badge variant={task.priority === "alta" ? "destructive" : "secondary"}>
                      {PRIORITY_LABEL[task.priority]}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => taskMutations.remove.mutate(task.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
            {!tasks.isLoading && (tasks.data ?? []).length === 0 && !tasks.error ? (
              <li className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma tarefa agendada.
              </li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
