import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { useCompany } from '@/company/CompanyProvider';
import { tenantInsert } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

const projectSchema = z.object({
  project_name: z.string().trim().nonempty({ message: 'Project name is required' }).max(200),
  client_name: z.string().trim().nonempty({ message: 'Client name is required' }).max(200),
  address: z.string().max(500).optional(),
  project_manager: z.string().max(100).optional(),
  status: z.enum(['Active', 'Inactive']),
});

interface Company {
  id: string;
  name: string;
}

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectAdded: () => void;
}

export const AddProjectDialog = ({ open, onOpenChange, onProjectAdded }: AddProjectDialogProps) => {
  const navigate = useNavigate();
  const { activeCompanyId, loading: companyLoading } = useCompany();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState({
    project_name: '',
    client_name: '',
    address: '',
    status: 'Active',
    project_manager: '',
    company_id: '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCompanies();
    }
  }, [open]);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .in('name', ['Forma Homes', 'GA Painting'])
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load companies',
        variant: 'destructive',
      });
    } else {
      setCompanies(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (companyLoading) return;
    if (!activeCompanyId) {
      toast({
        title: 'No company selected',
        description: 'Select or create a company before creating a project.',
        variant: 'destructive',
      });
      onOpenChange(false);
      // Push user toward the canonical flow
      navigate('/onboarding/company');
      return;
    }
    setLoading(true);

    try {
      const validatedData = projectSchema.parse({
        ...formData,
        address: formData.address || undefined,
        project_manager: formData.project_manager || undefined,
      });

      const { error } = await tenantInsert(
        'projects',
        {
          project_name: validatedData.project_name,
          client_name: validatedData.client_name,
          address: validatedData.address || null,
          status: validatedData.status,
          project_manager: validatedData.project_manager || null,
        },
        activeCompanyId
      );

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Project created successfully',
      });

      setFormData({
        project_name: '',
        client_name: '',
        address: '',
        status: 'Active',
        project_manager: '',
        company_id: '',
      });
      
      onProjectAdded();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0]?.message || 'Please check your inputs',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create project',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project_name">Project Name *</Label>
            <Input
              id="project_name"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_name">Client Name *</Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_manager">Project Manager</Label>
            <Input
              id="project_manager"
              value={formData.project_manager}
              onChange={(e) => setFormData({ ...formData, project_manager: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select company (optional)" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || companyLoading || !activeCompanyId}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
