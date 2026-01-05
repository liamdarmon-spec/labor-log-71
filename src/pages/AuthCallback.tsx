import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const code = params.get("code");

      try {
        // 1) Try session first (covers cases where detectSessionInUrl already handled)
        let { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        // 2) If no session yet and we have a PKCE code, exchange it
        if (!data.session && code) {
          const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchErr) throw exchErr;

          const res = await supabase.auth.getSession();
          data = res.data;
          if (res.error) throw res.error;
        }

        if (!cancelled) {
          if (data.session) {
            // Check if user has any company memberships
            const { data: memberships, error: memberError } = await supabase
              .from("company_members" as any)
              .select("company_id")
              .eq("user_id", data.session.user.id);

            if (memberError) {
              console.error("Error loading memberships:", memberError);
            }

            // If no memberships, go to onboarding
            if (!memberships || memberships.length === 0) {
              navigate("/onboarding/company", { replace: true });
            } else {
              // Has memberships, go to app
              // Ensure active_company_id is set
              const activeCompanyId = localStorage.getItem("active_company_id");
              const validCompanyIds = memberships.map((m: any) => m.company_id);
              
              if (!activeCompanyId || !validCompanyIds.includes(activeCompanyId)) {
                localStorage.setItem("active_company_id", memberships[0].company_id);
              }
              
              navigate("/app", { replace: true });
            }
          } else {
            navigate("/login?error=no_session", { replace: true });
          }
        }
      } catch (_e) {
        if (!cancelled) navigate("/login?error=auth_callback_failed", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}


