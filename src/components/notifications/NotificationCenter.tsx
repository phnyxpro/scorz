import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Info, CheckCircle, AlertTriangle, XCircle, Trash2, CheckCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    is_read: boolean;
    link?: string;
    created_at: string;
}

export function NotificationCenter() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);

    const { data: notifications, isLoading } = useQuery({
        queryKey: ["notifications", user?.id],
        enabled: !!user,
        queryFn: async () => {
            const { data, error } = await (supabase as any).from("notifications")
                .select("*")
                .eq("user_id", user!.id)
                .order("created_at", { ascending: false })
                .limit(20);
            if (error) throw error;
            return data as Notification[];
        },
    });

    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`user-notifications-${user.id}`)
            .on(
                "postgres_changes" as any,
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    qc.setQueryData(["notifications", user.id], (old: Notification[] = []) => [
                        payload.new as Notification,
                        ...old,
                    ]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, qc]);

    const markRead = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any).from("notifications")
                .update({ is_read: true })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
    });

    const markAllRead = useMutation({
        mutationFn: async () => {
            const { error } = await (supabase as any).from("notifications")
                .update({ is_read: true })
                .eq("user_id", user!.id)
                .eq("is_read", false);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
    });

    const deleteNotification = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any).from("notifications")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
    });

    const getTypeIcon = (type: Notification['type']) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-4 w-4 text-primary" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-accent" />;
            case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
            default: return <Info className="h-4 w-4 text-secondary" />;
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground" aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}>
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-primary text-primary-foreground text-[8px] animate-pulse" aria-hidden="true">
                            {unreadCount}
                        </Badge>
                    )}
                    {unreadCount > 0 && <span className="sr-only">{unreadCount} unread notifications</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 border-border/50 bg-card/95 backdrop-blur-xl" align="end">
                <div className="flex items-center justify-between p-4 border-b border-border/10">
                    <h3 className="text-xs font-bold uppercase tracking-widest">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] uppercase font-mono tracking-tighter"
                            onClick={() => markAllRead.mutate()}
                        >
                            <CheckCheck className="mr-1 h-3 w-3" /> Mark all read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-80">
                    {notifications && notifications.length > 0 ? (
                        <div className="divide-y divide-border/5">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`p-4 transition-colors relative group ${!n.is_read ? 'bg-primary/5' : 'hover:bg-muted/10'}`}
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-1">{getTypeIcon(n.type)}</div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-xs font-bold ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {n.title}
                                                </p>
                                                <span className="text-[8px] font-mono text-muted-foreground opacity-60">
                                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
                                                {n.message}
                                            </p>
                                            <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!n.is_read && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 text-[9px] px-1.5"
                                                        onClick={() => markRead.mutate(n.id)}
                                                    >
                                                        Mark as read
                                                    </Button>
                                                )}
                                                {n.link && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 text-[9px] px-1.5"
                                                        onClick={() => {
                                                            navigate(n.link!);
                                                            setOpen(false);
                                                            if (!n.is_read) markRead.mutate(n.id);
                                                        }}
                                                    >
                                                        View
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 text-[9px] px-1.5 text-destructive/50 hover:text-destructive"
                                                    onClick={() => deleteNotification.mutate(n.id)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground">
                                <Bell className="h-5 w-5 opacity-20" />
                            </div>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase">All caught up!</p>
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
