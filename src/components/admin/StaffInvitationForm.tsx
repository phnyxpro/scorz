import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useStaffInvitations, useInviteStaff, useDeleteInvitation } from "@/hooks/useStaffInvitations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Mail, Trash2, CheckCircle, Clock } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface StaffInvitationFormProps {
    competitionId: string;
    competitionName?: string;
}

export function StaffInvitationForm({ competitionId, competitionName }: StaffInvitationFormProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState<AppRole>("judge");
    const [isProduction, setIsProduction] = useState(false);
    const { data: invitations, isLoading } = useStaffInvitations(competitionId);
    const invite = useInviteStaff();
    const remove = useDeleteInvitation();

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        await invite.mutateAsync({
            name: name || undefined, email, phone: phone || undefined, role, competitionId, competitionName,
            isProductionAssistant: role === "organizer" ? isProduction : false,
        });
        setName("");
        setEmail("");
        setPhone("");
        setIsProduction(false);
    };

    return (
        <div className="space-y-6">
            <Card className="border-border/50 bg-card/80">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-primary" /> Invite Staff
                    </CardTitle>
                    <CardDescription>Invite judges and tabulators to your competition</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="staff-name">Name</Label>
                            <Input
                                id="staff-name"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="staff-email">Email Address *</Label>
                            <Input
                                id="staff-email"
                                type="email"
                                placeholder="colleague@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="staff-phone">Phone (optional)</Label>
                            <Input
                                id="staff-phone"
                                type="tel"
                                placeholder="+1 234 567 8900"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="staff-role">Role</Label>
                            <Select value={role} onValueChange={(v) => { setRole(v as AppRole); if (v !== "organizer") setIsProduction(false); }}>
                                <SelectTrigger id="staff-role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="organizer">Organizer</SelectItem>
                                    <SelectItem value="judge">Judge</SelectItem>
                                    <SelectItem value="tabulator">Tabulator</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {role === "organizer" && (
                            <div className="flex items-center gap-2 sm:col-span-2">
                                <Checkbox id="staff-production" checked={isProduction} onCheckedChange={(v) => setIsProduction(v === true)} />
                                <Label htmlFor="staff-production" className="text-sm cursor-pointer">
                                    Production Only <span className="text-muted-foreground text-xs">(Limited to Levels, Guidelines, Registrations & Updates)</span>
                                </Label>
                            </div>
                        )}
                        <div className="sm:col-span-2 flex justify-end">
                            <Button type="submit" disabled={invite.isPending || !email}>
                                <Mail className="h-4 w-4 mr-2" /> Send Invite
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    Invitations Status
                </h3>
                {isLoading ? (
                    <p className="text-xs text-muted-foreground animate-pulse">Loading invitations…</p>
                ) : invitations?.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No invitations sent yet.</p>
                ) : (
                    <div className="grid gap-2">
                        {invitations?.map((inv) => (
                            <div
                                key={inv.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${inv.accepted_at ? "bg-secondary/10" : "bg-primary/10"}`}>
                                        <Mail className={`h-4 w-4 ${inv.accepted_at ? "text-secondary" : "text-primary"}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{inv.name || inv.email}</p>
                                        {inv.name && <p className="text-xs text-muted-foreground">{inv.email}</p>}
                                        <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-[10px] py-0 h-4 uppercase">
                                                {inv.role}
                                            </Badge>
                                            {(inv as any).is_production_assistant && inv.role === "organizer" && (
                                                <Badge variant="outline" className="text-[10px] py-0 h-4 border-accent/50 text-accent-foreground">
                                                    Production
                                                </Badge>
                                            )}
                                            {inv.accepted_at ? (
                                                <Badge variant="secondary" className="text-[10px] py-0 h-4 gap-1">
                                                    <CheckCircle className="h-2.5 w-2.5" /> Accepted
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] py-0 h-4 gap-1 border-amber-500/50 text-amber-500">
                                                    <Clock className="h-2.5 w-2.5" /> Pending
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {!inv.accepted_at && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => remove.mutate({ id: inv.id, competitionId })}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
