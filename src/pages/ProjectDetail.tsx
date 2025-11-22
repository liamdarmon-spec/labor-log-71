import { Layout } from '@/components/Layout';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { ProjectOverviewTab } from '@/components/project/ProjectOverviewTab';
import { ProjectScheduleTabV2 } from '@/components/project/ProjectScheduleTabV2';
import { ProjectWorkforceTab } from '@/components/project/ProjectWorkforceTab';
import { ProjectCostsTab } from '@/components/project/ProjectCostsTab';
import { ProjectSubsTabV2 } from '@/components/project/ProjectSubsTabV2';
import { ProjectDocumentsTab } from '@/components/project/ProjectDocumentsTab';

interface Project {
  id: string;
  project_name: string;
  client_name: string;
  status: string;
  address: string | null;
  project_manager: string | null;
  company_id: string | null;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProjectData(id);
    }
  }, [id]);

  const fetchProjectData = async (projectId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      if (data) {
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate('/projects')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate('/projects')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Project not found</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>

        <ProjectHeader
          projectId={project.id}
          projectName={project.project_name}
          clientName={project.client_name}
          address={project.address}
          status={project.status}
          companyId={project.company_id}
        />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="workforce">Workforce</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="subs">Subs</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ProjectOverviewTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="schedule">
            <ProjectScheduleTabV2 projectId={project.id} />
          </TabsContent>

          <TabsContent value="workforce">
            <ProjectWorkforceTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="costs">
            <ProjectCostsTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="subs">
            <ProjectSubsTabV2 projectId={project.id} />
          </TabsContent>

          <TabsContent value="documents">
            <ProjectDocumentsTab projectId={project.id} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ProjectDetail;
        .from('project_dashboard_view')
        .select('*')
        .eq('project_id', id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
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

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Button variant="ghost" onClick={() => navigate('/projects')} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Project not found</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/projects')} size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{project.project_name}</h1>
                <Badge className={getStatusColor(project.status)} variant="outline">
                  {project.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">{project.client_name}</p>
            </div>
          </div>
        </div>

        {/* Project Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Total Hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{Number(project.total_hours).toFixed(1)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Cost
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${Number(project.total_cost).toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Workers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{project.worker_count}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Last Activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {project.last_activity 
                  ? format(new Date(project.last_activity), 'MMM d') 
                  : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="estimates">Estimates</TabsTrigger>
            <TabsTrigger value="proposals">Proposals</TabsTrigger>
            <TabsTrigger value="budget">Budget & Costs</TabsTrigger>
            <TabsTrigger value="subs">Subs</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ProjectOverviewEnhanced projectId={id!} />
          </TabsContent>

          <TabsContent value="estimates" className="mt-6">
            <ProjectEstimatesEnhanced projectId={id!} />
          </TabsContent>

          <TabsContent value="proposals" className="mt-6">
            <ProjectProposals projectId={id!} />
          </TabsContent>

          <TabsContent value="budget" className="mt-6">
            <ProjectBudgetCosts projectId={id!} />
          </TabsContent>

          <TabsContent value="subs" className="mt-6">
            <ProjectSubs projectId={id!} />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <ProjectInvoices projectId={id!} />
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <ProjectTasks projectId={id!} />
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <ProjectScheduleTab projectId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ProjectDetail;
