import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Pill, Calendar, User, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  medications: Medication[];
  diagnosis: string;
  instructions: string;
  duration: string;
  followUpDate: string;
  status: 'active' | 'completed' | 'discontinued';
  prescribedAt: string;
  pharmacy?: string;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const commonMedications = [
  "Atorvastatin (Lipitor)",
  "Metoprolol (Lopressor)",
  "Lisinopril (Prinivil)",
  "Amlodipine (Norvasc)",
  "Warfarin (Coumadin)",
  "Clopidogrel (Plavix)",
  "Aspirin",
  "Furosemide (Lasix)",
  "Digoxin (Lanoxin)",
  "Carvedilol (Coreg)"
];

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    patientId: "",
    diagnosis: "",
    instructions: "",
    duration: "",
    followUpDate: "",
    pharmacy: ""
  });
  const [medications, setMedications] = useState<Medication[]>([
    { name: "", dosage: "", frequency: "", duration: "", instructions: "" }
  ]);
  const { toast } = useToast();

  useEffect(() => {
    loadPrescriptions();
    loadPatients();
  }, []);

  const loadPrescriptions = () => {
    try {
      const stored = localStorage.getItem('cvms_prescriptions');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out pharmacy prescriptions and only get the main prescriptions
        const mainPrescriptions = parsed.filter((p: any) => 
          p.medications && Array.isArray(p.medications)
        );
        setPrescriptions(mainPrescriptions || []);
      } else {
        setPrescriptions([]);
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      setPrescriptions([]);
    }
  };

  const loadPatients = () => {
    try {
      const stored = localStorage.getItem('cvms_patients') || localStorage.getItem('cardiovascular-patients') || localStorage.getItem('patients');
      if (stored) {
        const parsed = JSON.parse(stored);
        setPatients(Array.isArray(parsed) ? parsed : []);
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]);
    }
  };

  const loadPatientAnalysis = (patientId: string) => {
    try {
      const analyses = JSON.parse(localStorage.getItem('cvms_analyses') || localStorage.getItem('cardiovascular-analyses') || '[]');
      return analyses.find((analysis: any) => analysis.patient_id === patientId);
    } catch (error) {
      console.error('Error loading patient analysis:', error);
      return null;
    }
  };

  const getPatientsWithAnalysis = () => {
    try {
      const analyses = JSON.parse(localStorage.getItem('cvms_analyses') || localStorage.getItem('cardiovascular-analyses') || '[]');
      return new Set(analyses.map((a: any) => a.patient_id));
    } catch (error) {
      console.error('Error getting patients with analysis:', error);
      return new Set();
    }
  };

  const addMedication = () => {
    setMedications([...medications, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  };

  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = medications.map((med, i) => 
      i === index ? { ...med, [field]: value } : med
    );
    setMedications(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedPatient = patients.find(p => p.id === formData.patientId);
    
    if (!selectedPatient) {
      toast({
        title: "Error",
        description: "Please select a patient",
        variant: "destructive",
      });
      return;
    }

    const validMedications = medications.filter(med => med.name && med.dosage);
    
    if (validMedications.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one medication",
        variant: "destructive",
      });
      return;
    }

    // Get analysis recommendations for this patient
    const patientAnalysis = loadPatientAnalysis(formData.patientId);
    
    const newPrescription: Prescription = {
      id: Date.now().toString(),
      patientId: formData.patientId,
      patientName: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
      doctorId: "current-doctor",
      doctorName: "Dr. Current Doctor",
      medications: validMedications,
      diagnosis: formData.diagnosis || patientAnalysis?.diagnosis || '',
      instructions: formData.instructions,
      duration: formData.duration,
      followUpDate: formData.followUpDate,
      status: 'active',
      prescribedAt: new Date().toISOString(),
      pharmacy: formData.pharmacy
    };

    const updatedPrescriptions = [newPrescription, ...(prescriptions || [])];
    setPrescriptions(updatedPrescriptions);
    
    // Save main prescription
    localStorage.setItem('cvms_prescriptions', JSON.stringify(updatedPrescriptions));
    
    // Also save individual medication prescriptions for pharmacy
    try {
      const existingPharmacyPrescriptions = JSON.parse(localStorage.getItem('cvms_prescriptions') || '[]');
      const pharmacyPrescriptions = Array.isArray(existingPharmacyPrescriptions) ? [...existingPharmacyPrescriptions] : [];
      
      validMedications.forEach(med => {
        pharmacyPrescriptions.push({
          id: `rx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          patient_id: formData.patientId,
          patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
          doctor_id: 'current-doctor',
          medication_name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      });
      
      localStorage.setItem('cvms_prescriptions', JSON.stringify(pharmacyPrescriptions));
    } catch (error) {
      console.error('Error saving pharmacy prescriptions:', error);
    }

    // Reset form
    setFormData({
      patientId: "",
      diagnosis: "",
      instructions: "",
      duration: "",
      followUpDate: "",
      pharmacy: ""
    });
    setMedications([{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);

    toast({
      title: "Success",
      description: "Prescription created successfully",
    });
  };

  const updatePrescriptionStatus = (prescriptionId: string, newStatus: string) => {
    const updatedPrescriptions = (prescriptions || []).map(p => 
      p.id === prescriptionId ? { ...p, status: newStatus as any } : p
    );
    setPrescriptions(updatedPrescriptions);
    localStorage.setItem('cvms_prescriptions', JSON.stringify(updatedPrescriptions));

    toast({
      title: "Status Updated",
      description: `Prescription status changed to ${newStatus}`,
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500 text-white';
      case 'completed': return 'bg-gray-500 text-white';
      case 'discontinued': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Safe array for mapping
  const safePrescriptions = Array.isArray(prescriptions) ? prescriptions : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Prescriptions</h1>
        <p className="text-muted-foreground">
          Manage patient medications and treatment plans
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prescription Form */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Create Prescription
            </CardTitle>
            <CardDescription>
              Prescribe medications for cardiac patients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient">Select Patient</Label>
                <Select value={formData.patientId} onValueChange={(value) => {
                  setFormData({...formData, patientId: value});
                  // Auto-fill diagnosis from analysis if available
                  const analysis = loadPatientAnalysis(value);
                  if (analysis) {
                    setFormData(prev => ({...prev, patientId: value, diagnosis: analysis.diagnosis || ''}));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(patients) && patients.map((patient) => {
                      const hasAnalysis = getPatientsWithAnalysis().has(patient.id);
                      return (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.last_name} - {patient.patient_id}
                          {hasAnalysis && " 💊"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Input
                  id="diagnosis"
                  placeholder="Hypertension, Angina, etc."
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                  required
                />
                {formData.patientId && loadPatientAnalysis(formData.patientId) && (
                  <p className="text-sm text-muted-foreground">
                    From analysis: {loadPatientAnalysis(formData.patientId)?.diagnosis}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Medications</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addMedication}>
                    Add Medication
                  </Button>
                </div>
                
                {medications.map((medication, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Medication {index + 1}</span>
                      {medications.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeMedication(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Select 
                        value={medication.name} 
                        onValueChange={(value) => updateMedication(index, 'name', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select medication..." />
                        </SelectTrigger>
                        <SelectContent>
                          {commonMedications.map((med) => (
                            <SelectItem key={med} value={med}>{med}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Dosage (e.g., 10mg)"
                        value={medication.dosage}
                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                      />
                      <Input
                        placeholder="Frequency (e.g., Once daily)"
                        value={medication.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Duration (e.g., 30 days)"
                        value={medication.duration}
                        onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                      />
                      <Input
                        placeholder="Special instructions"
                        value={medication.instructions}
                        onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">General Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Take with food, avoid alcohol, etc."
                  value={formData.instructions}
                  onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Treatment Duration</Label>
                  <Input
                    id="duration"
                    placeholder="e.g., 3 months"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followUpDate">Follow-up Date</Label>
                  <Input
                    id="followUpDate"
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({...formData, followUpDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pharmacy">Preferred Pharmacy</Label>
                <Input
                  id="pharmacy"
                  placeholder="Pharmacy name and location"
                  value={formData.pharmacy}
                  onChange={(e) => setFormData({...formData, pharmacy: e.target.value})}
                />
              </div>

              <Button type="submit" className="w-full">
                Create Prescription
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Prescription List */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              Recent Prescriptions
            </CardTitle>
            <CardDescription>
              Active and recent medication prescriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {safePrescriptions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Pill className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No prescriptions created yet</p>
                </div>
              ) : (
                safePrescriptions.map((prescription) => (
                  <div key={prescription.id} className="p-4 bg-background rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{prescription.patientName}</div>
                      <Badge className={getStatusBadgeColor(prescription.status)}>
                        {prescription.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div><strong>Diagnosis:</strong> {prescription.diagnosis}</div>
                      <div><strong>Doctor:</strong> {prescription.doctorName}</div>
                      
                      <div className="space-y-1">
                        <strong>Medications:</strong>
                        {prescription.medications.map((med, index) => (
                          <div key={index} className="ml-4 text-muted-foreground">
                            • {med.name} - {med.dosage}, {med.frequency}
                            {med.duration && ` for ${med.duration}`}
                          </div>
                        ))}
                      </div>
                      
                      {prescription.instructions && (
                        <div><strong>Instructions:</strong> {prescription.instructions}</div>
                      )}
                      
                      {prescription.followUpDate && (
                        <div><strong>Follow-up:</strong> {prescription.followUpDate}</div>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        Prescribed: {new Date(prescription.prescribedAt).toLocaleString()}
                      </div>
                    </div>
                    
                    {prescription.status === 'active' && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updatePrescriptionStatus(prescription.id, 'completed')}
                        >
                          Mark Completed
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updatePrescriptionStatus(prescription.id, 'discontinued')}
                        >
                          Discontinue
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}