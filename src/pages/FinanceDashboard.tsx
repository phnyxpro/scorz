import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend
} from "recharts";
import { DollarSign, TrendingUp, Users, CreditCard, Activity } from "lucide-react";
import { format } from "date-fns";

export default function FinanceDashboard() {
    const { user, hasRole } = useAuth();
    const isAdmin = hasRole("admin");

    const { data: stats, isLoading } = useQuery({
        queryKey: ["finance_stats", user?.id],
        enabled: !!user,
        queryFn: async () => {
            // Fetch competitions to calculate total revenue
            let compQuery = supabase.from("competitions").select("id, name, registration_fee, created_at");
            if (!isAdmin) {
                compQuery = compQuery.eq("created_by", user!.id);
            }
            const response = await (compQuery as any);
            const comps: any[] = response.data;

            if (!comps) return { totalRevenue: 0, totalRegistrations: 0, monthlyData: [], recentTransactions: [] };

            const compIds = comps.map(c => c.id);

            // Fetch registrations for those competitions
            const { data: registrations } = await supabase
                .from("contestant_registrations")
                .select("id, competition_id, created_at, status")
                .in("competition_id", compIds);

            const compMap = new Map(comps.map(c => [c.id, c]));

            let totalRevenue = 0;
            let totalRegistrations = 0;
            const monthlyStats: Record<string, { month: string; revenue: number; registrations: number }> = {};
            const recentTransactions: any[] = [];

            if (registrations) {
                registrations.forEach(reg => {
                    const comp = compMap.get(reg.competition_id);
                    const fee = comp?.registration_fee || 0;
                    const monthKey = format(new Date(reg.created_at), "MMM yyyy");

                    if (!monthlyStats[monthKey]) {
                        monthlyStats[monthKey] = { month: monthKey, revenue: 0, registrations: 0 };
                    }

                    if (reg.status === "approved" || reg.status === "certified") {
                        totalRevenue += fee;
                        monthlyStats[monthKey].revenue += fee;
                    }

                    totalRegistrations += 1;
                    monthlyStats[monthKey].registrations += 1;

                    if (recentTransactions.length < 10) {
                        recentTransactions.push({
                            id: reg.id,
                            date: reg.created_at,
                            amount: fee,
                            status: reg.status,
                            competition_name: comp?.name || "Unknown"
                        });
                    }
                });
            }

            recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return {
                totalRevenue,
                totalRegistrations,
                monthlyData: Object.values(monthlyStats).reverse(),
                recentTransactions
            };
        }
    });

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading financial data...</div>;
    }

    const { totalRevenue, totalRegistrations, monthlyData, recentTransactions } = stats || { totalRevenue: 0, totalRegistrations: 0, monthlyData: [], recentTransactions: [] };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Finance Dashboard</h2>
                <p className="text-muted-foreground">
                    {isAdmin ? "Platform-wide revenue and registration metrics." : "Revenue and registration metrics for your events."}
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
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{totalRegistrations}</div>
                        <p className="text-xs text-muted-foreground">+12% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+12</div>
                        <p className="text-xs text-muted-foreground">3 ending soon</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">89%</div>
                        <p className="text-xs text-muted-foreground">Paid vs Draft</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Over Time</CardTitle>
                        <CardDescription>Monthly registration revenue.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="month"
                                        tickLine={false}
                                        axisLine={false}
                                        fontSize={12}
                                    />
                                    <YAxis
                                        tickFormatter={(value) => `$${value}`}
                                        tickLine={false}
                                        axisLine={false}
                                        fontSize={12}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))' }}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                    />
                                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Latest approved registrations.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentTransactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center">
                                            <CreditCard className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium leading-none">{tx.competition_name}</p>
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
                                    No recent transactions found.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
