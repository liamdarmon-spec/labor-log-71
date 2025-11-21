import { Layout } from '@/components/Layout';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, MapPin, User, Building2, Calendar, Clock, DollarSign } from 'lucide-react';
import { AddProjectDialog } from '@/components/dashboard/AddProjectDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Project {
  id: string;
  project_name: string;
  client_name: string;
  address: string | null;
  project_manager: string | null;
  status: string;
  created_at: string;
  company_id: string | null;
  companies: { name: string } | null;
}

interface ProjectStats {
  totalHours: number;
  totalCost: number;
  workerCount: number;
  lastActivity: string | null;
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const filtered = projects.filter(
      (project) =>
        project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.address && project.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredProjects(filtered);
  }, [searchTerm, projects]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*, companies(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
      setFilteredProjects(data || []);
      
      // Fetch stats for each project
      if (data) {
        fetchProjectStats(data.map(p => p.id));
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectStats = async (projectIds: string[]) => {
    try {
      const { data: logs, error } = await supabase
        .from('daily_logs')
        .select('project_id, hours_worked, worker_id, date, workers(hourly_rate)')
        .in('project_id', projectIds);

      if (error) throw error;

      const stats: Record<string, ProjectStats> = {};
      
      projectIds.forEach(projectId => {
        const projectLogs = logs?.filter(log => log.project_id === projectId) || [];
        const totalHours = projectLogs.reduce((sum, log) => sum + Number(log.hours_worked), 0);
        const totalCost = projectLogs.reduce((sum, log) => {
          const rate = log.workers?.hourly_rate || 0;
          return sum + (Number(log.hours_worked) * Number(rate));
        }, 0);
        const uniqueWorkers = new Set(projectLogs.map(log => log.worker_id)).size;
        const lastActivity = projectLogs.length > 0
          ? projectLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
          : null;

        stats[projectId] = {
          totalHours,
          totalCost,
          workerCount: uniqueWorkers,
          lastActivity
        };
      });

      setProjectStats(stats);
    } catch (error) {
      console.error('Error fetching project stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'completed':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'on hold':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Project Hub</h1>
            <p className="text-muted-foreground">Manage and monitor all your projects</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search projects by name, client, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const stats = projectStats[project.id];
              return (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{project.project_name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <User className="w-3 h-3" />
                          {project.client_name}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(project.status)} variant="outline">
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{project.address}</span>
                      </div>
                    )}
                    
                    {project.project_manager && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>PM: {project.project_manager}</span>
                      </div>
                    )}
                    
                    {project.companies && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        <span>{project.companies.name}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t space-y-2">
                      {stats && (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              Total Hours
                            </span>
                            <span className="font-semibold">{stats.totalHours.toFixed(1)}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <DollarSign className="w-4 h-4" />
                              Total Cost
                            </span>
                            <span className="font-semibold">${stats.totalCost.toFixed(2)}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <User className="w-4 h-4" />
                              Workers
                            </span>
                            <span className="font-semibold">{stats.workerCount}</span>
                          </div>
                          
                          {stats.lastActivity && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                Last Activity
                              </span>
                              <span className="font-semibold">
                                {format(new Date(stats.lastActivity), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && filteredProjects.length === 0 && (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <Building2 className="w-12 h-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">No projects found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try a different search term' : 'Create your first project to get started'}
                </p>
              </div>
              {!searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Project
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      <AddProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onProjectAdded={fetchProjects}
      />
    </Layout>
  );
};

export default Projects;
