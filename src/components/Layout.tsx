import { Button } from '@/components/ui/button';
import { HardHat, Settings, Eye, BarChart3, DollarSign, CalendarClock, Languages, Building2, Users, CreditCard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MobileNav } from '@/components/MobileNav';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

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
          <nav className="hidden lg:flex items-center gap-2">
            <Button
              variant={location.pathname === '/dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/dashboard')}
              className={`gap-2 h-9 ${location.pathname === '/dashboard' ? 'font-semibold' : ''}`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </Button>
            <Button
              variant={location.pathname === '/projects' || location.pathname.startsWith('/projects/') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/projects')}
              className={`gap-2 h-9 ${location.pathname === '/projects' || location.pathname.startsWith('/projects/') ? 'font-semibold' : ''}`}
            >
              <Building2 className="w-4 h-4" />
              <span>Projects</span>
            </Button>
            <Button
              variant={location.pathname === '/view-logs' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/view-logs')}
              className={`gap-2 h-9 ${location.pathname === '/view-logs' ? 'font-semibold' : ''}`}
            >
              <Users className="w-4 h-4" />
              <span>Workforce</span>
            </Button>
            <Button
              variant={location.pathname === '/schedule' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/schedule')}
              className={`gap-2 h-9 ${location.pathname === '/schedule' ? 'font-semibold' : ''}`}
            >
              <CalendarClock className="w-4 h-4" />
              <span>Schedule</span>
            </Button>
            <Button
              variant={location.pathname === '/financials' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/financials')}
              className={`gap-2 h-9 ${location.pathname === '/financials' ? 'font-semibold' : ''}`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Financials</span>
            </Button>
            <Button
              variant={location.pathname === '/payments' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/payments')}
              className={`gap-2 h-9 ${location.pathname === '/payments' ? 'font-semibold' : ''}`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Payments</span>
            </Button>
            <Button
              variant={location.pathname === '/admin' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/admin')}
              className={`gap-2 h-9 ${location.pathname === '/admin' ? 'font-semibold' : ''}`}
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
      </header>
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 mb-20 md:mb-0">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
};
