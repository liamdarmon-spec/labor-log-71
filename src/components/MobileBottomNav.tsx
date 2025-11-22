import { NavLink } from 'react-router-dom';
import { Briefcase, Users, MoreHorizontal, BarChart3, DollarSign } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-colors ${
              isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`
          }
        >
          <BarChart3 className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </NavLink>

        <NavLink
          to="/projects"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-colors ${
              isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`
          }
        >
          <Briefcase className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] font-medium">Projects</span>
        </NavLink>

        <NavLink
          to="/workforce"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-colors ${
              isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`
          }
        >
          <Users className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] font-medium">Workforce</span>
        </NavLink>

        <NavLink
          to="/financials"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-colors ${
              isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`
          }
        >
          <DollarSign className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] font-medium">Financials</span>
        </NavLink>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center px-2 py-2 text-muted-foreground h-auto"
            >
              <MoreHorizontal className="h-5 w-5 mb-0.5" />
              <span className="text-[10px] font-medium">More</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-3xl">
            <div className="flex flex-col space-y-1 pt-6 pb-4">
              <NavLink
                to="/dashboard"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-base font-medium"
              >
                <span>Dashboard</span>
              </NavLink>
              <NavLink
                to="/admin"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-base font-medium"
              >
                <span>Admin</span>
              </NavLink>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
