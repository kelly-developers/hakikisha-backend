import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, UserPlus } from 'lucide-react';
import { Patient } from '@/hooks/usePatients';

interface PatientFormProps {
  onSubmit: (patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  initialData?: Partial<Patient>;
  isEdit?: boolean;
  trigger?: React.ReactNode;
}

export default function PatientForm({ onSubmit, initialData, isEdit = false, trigger }: PatientFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: initialData?.patient_id || '',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    date_of_birth: initialData?.date_of_birth || '',
    gender: initialData?.gender || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    address: initialData?.address || '',
    emergency_contact_name: initialData?.emergency_contact_name || '',
    emergency_contact_phone: initialData?.emergency_contact_phone || '',
    medical_history: initialData?.medical_history || '',
    allergies: initialData?.allergies || '',
    current_medications: initialData?.current_medications || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.first_name || !formData.last_name || !formData.date_of_birth) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      setOpen(false);
      if (!isEdit) {
        setFormData({
          patient_id: '',
          first_name: '',
          last_name: '',
          date_of_birth: '',
          gender: '',
          phone: '',
          email: '',
          address: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          medical_history: '',
          allergies: '',
          current_medications: '',
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      Add Patient
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {isEdit ? 'Edit Patient' : 'Add New Patient'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patient_id">Patient ID *</Label>
              <Input
                id="patient_id"
                value={formData.patient_id}
                onChange={(e) => setFormData(prev => ({ ...prev, patient_id: e.target.value }))}
                placeholder="P-2024-001"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="date_of_birth">Date of Birth *</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="patient@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
              <Input
                id="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
              <Input
                id="emergency_contact_phone"
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Full address..."
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="medical_history">Medical History</Label>
            <Textarea
              id="medical_history"
              value={formData.medical_history}
              onChange={(e) => setFormData(prev => ({ ...prev, medical_history: e.target.value }))}
              placeholder="Previous surgeries, conditions, etc..."
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea
              id="allergies"
              value={formData.allergies}
              onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
              placeholder="Drug allergies, food allergies, etc..."
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="current_medications">Current Medications</Label>
            <Textarea
              id="current_medications"
              value={formData.current_medications}
              onChange={(e) => setFormData(prev => ({ ...prev, current_medications: e.target.value }))}
              placeholder="Current medications and dosages..."
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading ? 'Saving...' : (isEdit ? 'Update Patient' : 'Add Patient')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}