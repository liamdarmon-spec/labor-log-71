import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { HardHat, LogOut, Settings, Eye, PlusCircle, BarChart3 } from 'lucide-react';
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
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-medium">
              <HardHat className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Forma Tracking</h1>
              <p className="text-xs text-muted-foreground">Labor Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={location.pathname === '/' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Entry</span>
            </Button>
            <Button
              variant={location.pathname === '/dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <Button
              variant={location.pathname === '/view-logs' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/view-logs')}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">View Logs</span>
            </Button>
            <Button
              variant={location.pathname === '/admin' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/admin')}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};
