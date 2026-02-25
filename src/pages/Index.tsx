import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Index() {
  return (
    <div className="auditorium-filter min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-lg"
      >
        <div className="inline-flex items-center gap-3 mb-6">
          <Zap className="h-12 w-12 text-primary" />
          <h1 className="text-5xl font-bold tracking-tighter text-foreground">SCORE</h1>
        </div>
        <p className="text-muted-foreground font-mono text-sm mb-2">Powered by PHNYX.DEV</p>
        <p className="text-muted-foreground text-base mb-8 max-w-sm mx-auto">
          Competition management for live adjudicated events. Real-time scoring, multi-level certification, audience voting.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild size="lg">
            <Link to="/auth">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
