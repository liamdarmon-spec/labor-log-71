import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleEditButtonProps {
  onClick: () => void;
}

export function ScheduleEditButton({ onClick }: ScheduleEditButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-8 px-2 hover:bg-accent hover:text-accent-foreground"
    >
      <Edit2 className="h-4 w-4" />
    </Button>
  );
}
