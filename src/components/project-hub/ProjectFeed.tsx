import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Sparkles, Layout, CheckCircle2 } from 'lucide-react';

export interface ProjectFeedProps {
  projectId: string;
}

export function ProjectFeed({ projectId }: ProjectFeedProps) {
  // Placeholder items - real activity feed coming in a later step
  const placeholderItems = [
    { id: '1', icon: Sparkles, text: 'Task hub launched', time: 'Just now' },
    { id: '2', icon: Layout, text: 'Budget overview redesigned', time: '2 hours ago' },
    { id: '3', icon: CheckCircle2, text: 'Project Command Center live', time: 'Today' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Project Activity
        </CardTitle>
        <p className="text-xs text-muted-foreground">Activity feed coming soon</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {placeholderItems.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
            >
              <div className="p-1.5 rounded-md bg-primary/10">
                <item.icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.text}</p>
                <p className="text-xs text-muted-foreground">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
