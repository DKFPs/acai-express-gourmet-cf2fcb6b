import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

export function NotificationsMenu() {
  const { items, unread, markRead, markAllRead } = useNotifications();
  const { user } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notificações">
          <Bell className="h-[18px] w-[18px]" />
          {unread.length > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 rounded-xl p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Nenhuma notificação por enquanto.
          </p>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="divide-y divide-border">
              {items.map((item) => {
                const isUnread = user ? !item.read_by.includes(user.id) : false;
                const content = (
                  <div
                    className={cn(
                      "flex flex-col gap-0.5 px-3 py-2.5 transition-colors hover:bg-accent",
                      isUnread && "bg-primary/5",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      {item.title}
                    </span>
                    {item.message && (
                      <span className="text-xs text-muted-foreground">{item.message}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                );

                return (
                  <div key={item.id} onClick={() => markRead.mutate(item)}>
                    {item.link ? <Link to={item.link}>{content}</Link> : content}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
