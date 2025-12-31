import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { rpcCreateCompany } from "@/lib/supabase";
import { useCompany } from "@/company/CompanyProvider";

const schema = z.object({
  name: z.string().trim().min(2, "Company name is too short").max(120),
});

export default function CompanyOnboardingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { companies, activeCompanyId, setActiveCompanyId, refreshCompanies, loading } = useCompany();

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mode = useMemo(() => {
    if (loading) return "loading" as const;
    if (companies.length === 0) return "create" as const;
    if (companies.length === 1) return "auto" as const;
    if (activeCompanyId) return "done" as const;
    return "select" as const;
  }, [companies.length, activeCompanyId, loading]);

  useEffect(() => {
    if (mode === "auto") {
      setActiveCompanyId(companies[0].companyId);
      navigate("/app", { replace: true });
    }
    if (mode === "done") {
      navigate("/app", { replace: true });
    }
  }, [mode, companies, navigate, setActiveCompanyId]);

  if (mode === "auto" || mode === "done") return null;

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      schema.parse({ name });
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message ?? "Invalid company name";
      toast({ title: "Validation error", description: msg, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const id = await rpcCreateCompany(name.trim());
      setActiveCompanyId(id);
      await refreshCompanies();
      navigate("/app", { replace: true });
    } catch (err: any) {
      toast({ title: "Failed to create company", description: err?.message ?? "RPC failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "select") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
        <Card className="w-full max-w-md border-border shadow-xl">
          <CardHeader>
            <CardTitle>Select a company</CardTitle>
            <CardDescription>Choose which tenant you want to work in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {companies.map((c) => (
              <Button
                key={c.companyId}
                variant="outline"
                className="w-full justify-between"
                onClick={() => {
                  setActiveCompanyId(c.companyId);
                  navigate("/app", { replace: true });
                }}
              >
                <span className="truncate">{c.companyName}</span>
                <span className="text-xs text-muted-foreground">{c.role}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // create
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader>
          <CardTitle>Create your company</CardTitle>
          <CardDescription>You need a company to start using the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Construction"
                disabled={submitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating..." : "Create company"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


