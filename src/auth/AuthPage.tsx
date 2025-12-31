import { useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { HardHat } from "lucide-react";
import { signIn, signUp } from "@/lib/supabase";

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100),
});

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const initialMode = useMemo(() => {
    if (location.pathname === "/signup") return "signup" as const;
    return "login" as const;
  }, [location.pathname]);

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNeedsEmailConfirm(false);

    try {
      authSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation Error", description: error.errors[0].message, variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate("/app", { replace: true });
      } else {
        const { data, error } = await signUp(email, password);
        if (error) throw error;

        // If email confirmations are enabled, Supabase returns user but no session.
        if (data?.user && !data?.session) {
          setNeedsEmailConfirm(true);
          toast({
            title: "Check your email",
            description: "Confirm your email address to finish signing up.",
          });
          return;
        }

        navigate("/onboarding/company", { replace: true });
      }
    } catch (err: any) {
      toast({ title: "Auth Error", description: err?.message ?? "Failed to authenticate", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <HardHat className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">Forma</CardTitle>
            <CardDescription className="text-base mt-2">
              {mode === "login" ? "Log in to continue" : "Create your account"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsEmailConfirm && (
            <div className="text-sm rounded-md border border-border bg-muted/50 p-3">
              Email confirmation is required. After confirming, return here and log in.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          {mode === "login" && (
            <div className="text-center text-sm">
              <Link to="/reset" className="text-primary hover:underline">
                Forgot your password?
              </Link>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline" onClick={() => setMode("signup")}>
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline" onClick={() => setMode("login")}>
                  Log in
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


