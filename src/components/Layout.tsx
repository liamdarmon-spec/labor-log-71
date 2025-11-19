import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { HardHat, LogOut, Settings, Eye, PlusCircle, BarChart3, DollarSign } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { signOut, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-soft">
        <div className="container mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-medium flex-shrink-0">
              <HardHat className="w-4 h-4 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-bold text-foreground truncate">Forma Tracking</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block">Labor Management</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button
              variant={location.pathname === '/' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/')}
              className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline text-xs sm:text-sm">Entry</span>
            </Button>
            <Button
              variant={location.pathname === '/view-logs' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/view-logs')}
              className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
            >
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline text-xs sm:text-sm">Time Log</span>
            </Button>
            <Button
              variant={location.pathname === '/payments' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/payments')}
              className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
            >
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden lg:inline text-xs sm:text-sm">Payment</span>
            </Button>
            <Button
              variant={location.pathname === '/dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden lg:inline text-xs sm:text-sm">Dashboard</span>
            </Button>
            <Button
              variant={location.pathname === '/admin' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/admin')}
              className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xl:inline text-xs sm:text-sm">Admin</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xl:inline text-xs sm:text-sm">Logout</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
};
