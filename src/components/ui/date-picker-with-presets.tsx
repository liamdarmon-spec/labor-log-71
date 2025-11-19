import * as React from "react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerWithPresetsProps {
  date: Date;
  onDateChange: (date: Date) => void;
  disabled?: boolean;
}

export function DatePickerWithPresets({ 
  date, 
  onDateChange, 
  disabled 
}: DatePickerWithPresetsProps) {
  const [open, setOpen] = React.useState(false);

  const presets = [
    {
      label: "Today",
      action: () => {
        onDateChange(new Date());
        setOpen(false);
      },
    },
    {
      label: "Yesterday",
      action: () => {
        onDateChange(subDays(new Date(), 1));
        setOpen(false);
      },
    },
    {
      label: "2 Days Ago",
      action: () => {
        onDateChange(subDays(new Date(), 2));
        setOpen(false);
      },
    },
    {
      label: "Last Monday",
      action: () => {
        const today = new Date();
        const currentDay = today.getDay();
        const daysToSubtract = currentDay === 0 ? 6 : currentDay + 6;
        onDateChange(subDays(today, daysToSubtract));
        setOpen(false);
      },
    },
    {
      label: "Last Friday",
      action: () => {
        const today = new Date();
        const currentDay = today.getDay();
        const daysToSubtract = currentDay === 0 ? 2 : currentDay <= 5 ? currentDay + 2 : currentDay - 5;
        onDateChange(subDays(today, daysToSubtract));
        setOpen(false);
      },
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-11",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto flex-col space-y-2 p-2" align="start">
        <div className="flex flex-wrap gap-1 border-b pb-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              size="sm"
              onClick={preset.action}
              className="flex-1 min-w-[80px] text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            if (selectedDate) {
              onDateChange(selectedDate);
              setOpen(false);
            }
          }}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
