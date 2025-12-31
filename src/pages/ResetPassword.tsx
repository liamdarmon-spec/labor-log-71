import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const emailSchema = z.object({
  email: z.string().trim().email().max(255),
});

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(Boolean(data.session));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse({ email });
    } catch (err: any) {
      toast({ title: "Validation error", description: err?.errors?.[0]?.message ?? "Invalid email", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/reset`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      toast({
        title: "Check your email",
        description: "We sent a password reset link. Open it to set a new password.",
      });
    } catch (err: any) {
      toast({ title: "Reset failed", description: err?.message ?? "Failed to send reset email", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const onSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      passwordSchema.parse({ password });
    } catch (err: any) {
      toast({ title: "Validation error", description: err?.errors?.[0]?.message ?? "Invalid password", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message ?? "Failed to update password", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader>
          <CardTitle>{hasSession ? "Set a new password" : "Reset your password"}</CardTitle>
          <CardDescription>
            {hasSession
              ? "Choose a new password for your account."
              : "Enter your email and we’ll send you a password reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSession ? (
            <form onSubmit={onSetNewPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Saving..." : "Update password"}
              </Button>
            </form>
          ) : (
            <form onSubmit={onRequestReset} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  placeholder="you@company.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


