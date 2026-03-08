import { DashboardSkeleton } from "@/components/shared/PageSkeletons";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { DollarSign, TrendingUp, Users, CreditCard, Activity, Ticket } from "lucide-react";
import { format } from "date-fns";

export default function FinanceDashboard() {
    const { user, hasRole } = useAuth();
    const isAdmin = hasRole("admin");

    const { data: stats, isLoading } = useQuery({
        queryKey: ["finance_stats", user?.id],
        enabled: !!user,
        queryFn: async () => {
            // --- Ticket revenue ---
            const { data: tickets } = await supabase
                .from("event_tickets")
                .select("id, ticket_type, payment_status, created_at, sub_event_id");

            const paidTickets = (tickets || []).filter(t => t.payment_status === "paid");
            // We don't have ticket price on the ticket row, so join with sub_events
            const subEventIds = [...new Set(paidTickets.map(t => t.sub_event_id))];
            let ticketPriceMap = new Map<string, number>();
            if (subEventIds.length > 0) {
                const { data: subEvents } = await supabase
                    .from("sub_events")
                    .select("id, ticket_price")
                    .in("id", subEventIds);
                (subEvents || []).forEach(se => ticketPriceMap.set(se.id, Number(se.ticket_price) || 0));
            }

            let ticketRevenue = 0;
            paidTickets.forEach(t => { ticketRevenue += ticketPriceMap.get(t.sub_event_id) || 0; });

            // --- Credit revenue ---
            const { data: credits } = await supabase
                .from("competition_credits")
                .select("id, tier_product_id, purchased_at");

            // Map tier to price
            const tierPrices: Record<string, number> = {
                "prod_start": 15,
                "prod_pro": 49,
                "prod_enterprise": 149,
            };
            let creditRevenue = 0;
            (credits || []).forEach(c => {
                // Try exact match or partial match
                const price = tierPrices[c.tier_product_id] ||
                    (c.tier_product_id?.includes("start") ? 15 :
                     c.tier_product_id?.includes("pro") ? 49 :
                     c.tier_product_id?.includes("enterprise") ? 149 : 0);
                creditRevenue += price;
            });

            const totalRevenue = ticketRevenue + creditRevenue;

            // --- Active events ---
            const { count: activeEventsCount } = await supabase
                .from("competitions")
                .select("id", { count: "exact", head: true })
                .eq("status", "active");

            // --- Total registrations ---
            let regQuery = supabase.from("contestant_registrations").select("id, competition_id, created_at, status");
            if (!isAdmin) {
                // For non-admin, filter by their competitions
                const { data: myComps } = await supabase
                    .from("competitions")
                    .select("id")
                    .eq("created_by", user!.id);
                const compIds = (myComps || []).map(c => c.id);
                if (compIds.length > 0) {
                    regQuery = regQuery.in("competition_id", compIds);
                }
            }
            const { data: registrations } = await regQuery;

            const totalRegistrations = registrations?.length || 0;
            const approvedRegistrations = (registrations || []).filter(r => r.status === "approved").length;
            const approvalRate = totalRegistrations > 0 ? Math.round((approvedRegistrations / totalRegistrations) * 100) : 0;

            // --- Monthly data for chart ---
            const monthlyStats: Record<string, { month: string; tickets: number; credits: number }> = {};

            paidTickets.forEach(t => {
                const monthKey = format(new Date(t.created_at), "MMM yyyy");
                if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { month: monthKey, tickets: 0, credits: 0 };
                monthlyStats[monthKey].tickets += ticketPriceMap.get(t.sub_event_id) || 0;
            });

            (credits || []).forEach(c => {
                const monthKey = format(new Date(c.purchased_at), "MMM yyyy");
                if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { month: monthKey, tickets: 0, credits: 0 };
                const price = tierPrices[c.tier_product_id] ||
                    (c.tier_product_id?.includes("start") ? 15 :
                     c.tier_product_id?.includes("pro") ? 49 :
                     c.tier_product_id?.includes("enterprise") ? 149 : 0);
                monthlyStats[monthKey].credits += price;
            });

            // --- Recent transactions (credits purchased) ---
            const recentTransactions = (credits || [])
                .sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime())
                .slice(0, 10)
                .map(c => {
                    const price = tierPrices[c.tier_product_id] ||
                        (c.tier_product_id?.includes("start") ? 15 :
                         c.tier_product_id?.includes("pro") ? 49 :
                         c.tier_product_id?.includes("enterprise") ? 149 : 0);
                    const tierName = c.tier_product_id?.includes("enterprise") ? "Enterprise" :
                        c.tier_product_id?.includes("pro") ? "Pro" : "Start";
                    return {
                        id: c.id,
                        date: c.purchased_at,
                        amount: price,
                        label: `${tierName} Scorz Credit`,
                    };
                });

            return {
                totalRevenue,
                ticketRevenue,
                creditRevenue,
                totalRegistrations,
                activeEventsCount: activeEventsCount || 0,
                approvalRate,
                monthlyData: Object.values(monthlyStats).reverse().slice(-12),
                recentTransactions,
            };
        }
    });

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    const { totalRevenue, ticketRevenue, creditRevenue, totalRegistrations, activeEventsCount, approvalRate, monthlyData, recentTransactions } = stats || {
        totalRevenue: 0, ticketRevenue: 0, creditRevenue: 0, totalRegistrations: 0, activeEventsCount: 0, approvalRate: 0, monthlyData: [], recentTransactions: []
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Finance Dashboard</h2>
                <p className="text-muted-foreground">
                    {isAdmin ? "Platform-wide revenue and financial metrics." : "Revenue and financial metrics for your events."}
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            ${ticketRevenue.toFixed(2)} tickets · ${creditRevenue.toFixed(2)} credits
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRegistrations}</div>
                        <p className="text-xs text-muted-foreground">Total contestant registrations</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeEventsCount}</div>
                        <p className="text-xs text-muted-foreground">Currently active competitions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvalRate}%</div>
                        <p className="text-xs text-muted-foreground">Approved vs total registrations</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Over Time</CardTitle>
                        <CardDescription>Monthly ticket and credit revenue.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            {monthlyData.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                    No revenue data yet
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                                        <YAxis tickFormatter={(value) => `$${value}`} tickLine={false} axisLine={false} fontSize={12} />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--muted))' }}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                        />
                                        <Bar dataKey="tickets" name="Ticket Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} stackId="a" />
                                        <Bar dataKey="credits" name="Credit Revenue" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} stackId="a" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Latest credit purchases.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentTransactions.map((tx: any) => (
                                <div key={tx.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center">
                                            <CreditCard className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium leading-none">{tx.label}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {format(new Date(tx.date), "MMM d, yyyy")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="font-bold text-sm">
                                        +${tx.amount.toFixed(2)}
                                    </div>
                                </div>
                            ))}
                            {recentTransactions.length === 0 && (
                                <div className="text-center text-sm text-muted-foreground py-8">
                                    No transactions yet.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
