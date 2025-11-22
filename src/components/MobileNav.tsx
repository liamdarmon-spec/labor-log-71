import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, DollarSign, BarChart3, Settings, LogOut, CalendarClock, Building2, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { path: '/projects', icon: Building2, label: 'Projects' },
    { path: '/schedule', icon: CalendarClock, label: 'Schedule' },
    { path: '/workforce', icon: Users, label: 'Workforce' },
    { path: '/financials', icon: BarChart3, label: 'Costs' },
    { path: '/payments', icon: DollarSign, label: 'Payments' },
    { path: '/admin', icon: Settings, label: 'Admin' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden h-8 w-8 p-0">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Menu</h2>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => handleNavigate(item.path)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-base">{item.label}</span>
                </Button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                signOut();
                setOpen(false);
              }}
            >
              <LogOut className="w-5 h-5" />
              <span className="text-base">Logout</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
