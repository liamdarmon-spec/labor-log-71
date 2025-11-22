import { NavLink } from 'react-router-dom';
import { Briefcase, Users, Calendar, MoreHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-2">
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors ${
              isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`
          }
        >
          <Briefcase className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">Projects</span>
        </NavLink>

        <NavLink
          to="/workforce"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors ${
              isActive || window.location.pathname.startsWith('/workforce') ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`
          }
        >
          <Users className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">Workforce</span>
        </NavLink>

        <NavLink
          to="/schedule"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors ${
              isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`
          }
        >
          <Calendar className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">Schedule</span>
        </NavLink>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center px-3 py-2 text-muted-foreground"
            >
              <MoreHorizontal className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">More</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <div className="flex flex-col space-y-2 pt-4">
              <NavLink
                to="/dashboard"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">Dashboard</span>
              </NavLink>
              <NavLink
                to="/financials"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">Financials</span>
              </NavLink>
              <NavLink
                to="/view-logs"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">Costs</span>
              </NavLink>
              <NavLink
                to="/payments"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">Payments</span>
              </NavLink>
              <NavLink
                to="/admin"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">Admin</span>
              </NavLink>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
