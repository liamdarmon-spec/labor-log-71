import { NavLink } from 'react-router-dom';
import { Briefcase, Users, MoreHorizontal, DollarSign, CheckSquare, CalendarDays, FileDiff } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-1">
        <NavLink
          to="/app/projects"
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
          to="/app/tasks"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-colors ${
              isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`
          }
        >
          <CheckSquare className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] font-medium">Tasks</span>
        </NavLink>

        <NavLink
          to="/app/schedule"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-colors ${
              isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`
          }
        >
          <CalendarDays className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] font-medium">Schedule</span>
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
                to="/app/workforce"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-base font-medium"
              >
                <Users className="h-5 w-5" />
                <span>Workforce</span>
              </NavLink>
              <NavLink
                to="/app/financials"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-base font-medium"
              >
                <DollarSign className="h-5 w-5" />
                <span>Financials</span>
              </NavLink>
              <NavLink
                to="/app/change-orders"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-base font-medium"
              >
                <FileDiff className="h-5 w-5" />
                <span>Change Orders</span>
              </NavLink>
              <NavLink
                to="/app/admin"
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
