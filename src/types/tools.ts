export interface Reminder {
  id: string;
  company_id: string;
  title: string;
  done: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = "baixa" | "normal" | "alta";

export interface TaskItem {
  id: string;
  company_id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: TaskPriority;
  done: boolean;
  done_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: TaskPriority;
}
