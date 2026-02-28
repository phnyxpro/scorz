import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, ClipboardList, Mic } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { user, roles } = useAuth();

  const cards = [
    { title: "Competitions", desc: "Manage events & stages", icon: Trophy, color: "text-primary", to: "/competitions" },
    { title: "Judging", desc: "Score performances", icon: ClipboardList, color: "text-secondary", to: "/judging" },
    { title: "Contestants", desc: "Registrations & profiles", icon: Users, color: "text-primary", to: "/profile" },
    { title: "People's Choice", desc: "Audience voting", icon: Mic, color: "text-secondary", to: "/competitions" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back{user?.email ? `, ${user.email}` : ""}
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
          {cards.map((c) => (
          <motion.div key={c.title} variants={item}>
            <Link to={c.to}>
              <Card className="border-border/50 bg-card/80 hover:bg-card transition-colors cursor-pointer group">
                <CardHeader className="pb-2">
                  <c.icon className={`h-8 w-8 ${c.color} mb-2 group-hover:scale-110 transition-transform`} />
                  <CardTitle className="text-base">{c.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{c.desc}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
