import { useCompany } from "@/company/CompanyProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown } from "lucide-react";

export function CompanySwitcher() {
  const { companies, activeCompany, setActiveCompanyId } = useCompany();

  if (!companies || companies.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <Building2 className="w-4 h-4" />
          <span className="max-w-[180px] truncate">
            {activeCompany?.companyName ?? "Select company"}
          </span>
          <ChevronDown className="w-4 h-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[240px]">
        {companies.map((c) => (
          <DropdownMenuItem
            key={c.companyId}
            onClick={() => {
              setActiveCompanyId(c.companyId);
              window.location.reload();
            }}
          >
            <div className="flex flex-col">
              <span className="font-medium">{c.companyName}</span>
              <span className="text-xs text-muted-foreground">{c.role}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


