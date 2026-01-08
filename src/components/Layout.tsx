import { Button } from '@/components/ui/button';
import { HardHat, Settings, DollarSign, CalendarClock, Languages, Building2, Users, CheckSquare, CalendarDays } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MobileNav } from '@/components/MobileNav';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useTranslation } from 'react-i18next';
import { CompanySwitcher } from '@/company/CompanySwitcher';
import { useCompany } from '@/company/CompanyProvider';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export const Layout = ({ children, hideNav = false }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { activeCompanyId, companies, lastError } = useCompany();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  // If hideNav is true, render a minimal shell without the header/nav
  if (hideNav) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-soft">
        <div className="container mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <MobileNav />
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-medium flex-shrink-0">
              <HardHat className="w-4 h-4 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-bold text-foreground truncate">{t('app.name')}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block">{t('app.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CompanySwitcher />
            <nav className="hidden lg:flex items-center gap-2">
            <Button
              variant={location.pathname === '/app/projects' || location.pathname.startsWith('/app/projects/') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/app/projects')}
              className={`gap-2 h-9 ${location.pathname === '/app/projects' || location.pathname.startsWith('/app/projects/') ? 'font-semibold' : ''}`}
            >
              <Building2 className="w-4 h-4" />
              <span>Projects</span>
            </Button>
            <Button
              variant={location.pathname === '/app/tasks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/app/tasks')}
              className={`gap-2 h-9 ${location.pathname === '/app/tasks' ? 'font-semibold' : ''}`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Tasks</span>
            </Button>
            <Button
              variant={location.pathname === '/app/schedule' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/app/schedule')}
              className={`gap-2 h-9 ${location.pathname === '/app/schedule' ? 'font-semibold' : ''}`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Schedule</span>
            </Button>
            <Button
              variant={location.pathname.startsWith('/app/workforce') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/app/workforce')}
              className={`gap-2 h-9 ${location.pathname.startsWith('/app/workforce') ? 'font-semibold' : ''}`}
            >
              <Users className="w-4 h-4" />
              <span>Workforce</span>
            </Button>
            <Button
              variant={location.pathname.startsWith('/app/financials') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/app/financials')}
              className={`gap-2 h-9 ${location.pathname.startsWith('/app/financials') ? 'font-semibold' : ''}`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Financials</span>
            </Button>
            <Button
              variant={location.pathname.startsWith('/app/proposals') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/app/proposals')}
              className={`gap-2 h-9 ${location.pathname.startsWith('/app/proposals') ? 'font-semibold' : ''}`}
            >
              <CalendarClock className="w-4 h-4" />
              <span>Proposals</span>
            </Button>
            <Button
              variant={location.pathname === '/app/admin' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/app/admin')}
              className={`gap-2 h-9 ${location.pathname === '/app/admin' ? 'font-semibold' : ''}`}
            >
              <Settings className="w-4 h-4" />
              <span>Admin</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-9">
                  <Languages className="w-4 h-4" />
                  <span className="uppercase">{i18n.language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => changeLanguage('en')}>
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage('es')}>
                  Español
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </nav>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 mb-20 md:mb-0">
        {children}
      </main>
      <MobileBottomNav />

      {!import.meta.env.PROD && (
        <div className="fixed bottom-2 left-2 z-[9999] rounded-md border border-border bg-black/80 text-white px-3 py-2 text-[11px] font-mono space-y-1">
          <div>user: {user?.id ?? 'none'}</div>
          <div>active_company_id: {activeCompanyId ?? 'none'}</div>
          <div>memberships: {companies.length}</div>
          <div>last_error: {lastError ?? 'none'}</div>
        </div>
      )}
    </div>
  );
};
