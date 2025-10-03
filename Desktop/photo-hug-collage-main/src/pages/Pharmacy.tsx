import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Package, Search, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Prescription {
  id: string;
  patient_id: string;
  patient_name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  doctor_id: string;
  status: 'pending' | 'dispensed' | 'collected';
  created_at: string;
  dispensed_at?: string;
  collected_at?: string;
}

export default function Pharmacy() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const storedPrescriptions = localStorage.getItem('cvms_prescriptions');
      if (storedPrescriptions) {
        const parsed = JSON.parse(storedPrescriptions);
        
        // Filter out main prescription objects and only get individual medication prescriptions
        const pharmacyPrescriptions = parsed.filter((p: any) => 
          p.medication_name && !p.medications // Only individual medication entries
        );
        
        // Add patient names with fallback for missing data
        const storedPatients = localStorage.getItem('cvms_patients');
        if (storedPatients) {
          const patients = JSON.parse(storedPatients);
          const enriched = pharmacyPrescriptions.map((p: any) => {
            const patient = patients.find((pt: any) => pt.id === p.patient_id);
            return {
              ...p,
              patient_name: p.patient_name || (patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'),
              medication_name: p.medication_name || 'Unknown Medication',
              status: p.status || 'pending'
            };
          });
          setPrescriptions(enriched);
        } else {
          // If no patients found, ensure all prescriptions have required fields
          const safePrescriptions = pharmacyPrescriptions.map((p: any) => ({
            ...p,
            patient_name: p.patient_name || 'Unknown Patient',
            medication_name: p.medication_name || 'Unknown Medication',
            status: p.status || 'pending'
          }));
          setPrescriptions(safePrescriptions);
        }
      } else {
        setPrescriptions([]);
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      setPrescriptions([]);
    }
  };

  const savePrescriptions = (presc: Prescription[]) => {
    try {
      // Get existing prescriptions from localStorage
      const existingPrescriptions = JSON.parse(localStorage.getItem('cvms_prescriptions') || '[]');
      
      // Filter out the pharmacy prescriptions we're about to update
      const otherPrescriptions = existingPrescriptions.filter((p: any) => 
        !p.medication_name || p.medications // Keep main prescriptions and non-pharmacy entries
      );
      
      // Convert our pharmacy prescriptions to the format we want to save
      const pharmacyPrescriptionsToSave = presc.map(prescription => ({
        id: prescription.id,
        patient_id: prescription.patient_id,
        patient_name: prescription.patient_name, // Keep patient_name!
        medication_name: prescription.medication_name,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        instructions: prescription.instructions,
        doctor_id: prescription.doctor_id,
        status: prescription.status,
        created_at: prescription.created_at,
        dispensed_at: prescription.dispensed_at,
        collected_at: prescription.collected_at
      }));
      
      // Combine both types of prescriptions
      const allPrescriptions = [...otherPrescriptions, ...pharmacyPrescriptionsToSave];
      localStorage.setItem('cvms_prescriptions', JSON.stringify(allPrescriptions));
      setPrescriptions(presc);
    } catch (error) {
      console.error('Error saving prescriptions:', error);
      toast({
        title: "Error",
        description: "Failed to save prescriptions",
        variant: "destructive",
      });
    }
  };

  const handleDispense = (id: string) => {
    const updated = prescriptions.map(p =>
      p.id === id ? { ...p, status: 'dispensed' as const, dispensed_at: new Date().toISOString() } : p
    );
    savePrescriptions(updated);
    
    toast({
      title: "Medication Dispensed",
      description: "Prescription has been prepared for collection",
    });
  };

  const handleCollect = (id: string) => {
    const updated = prescriptions.map(p =>
      p.id === id ? { ...p, status: 'collected' as const, collected_at: new Date().toISOString() } : p
    );
    savePrescriptions(updated);
    
    toast({
      title: "Medication Collected",
      description: "Patient has collected the prescribed medication",
    });
  };

  const filteredPrescriptions = prescriptions.filter(p => {
    const patientName = p.patient_name?.toLowerCase() || '';
    const medicationName = p.medication_name?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();
    
    return patientName.includes(searchLower) || medicationName.includes(searchLower);
  });

  const pendingCount = prescriptions.filter(p => p.status === 'pending').length;
  const dispensedCount = prescriptions.filter(p => p.status === 'dispensed').length;
  const collectedCount = prescriptions.filter(p => p.status === 'collected').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Pharmacy</h1>
        <p className="text-muted-foreground">
          Manage prescription dispensing and medication collection
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting dispensing</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Dispensed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{dispensedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for collection</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{collectedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed today</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            Prescription Queue
          </CardTitle>
          <CardDescription>Dispense and track medication distribution</CardDescription>
          <div className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name or medication..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPrescriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No prescriptions found</p>
              </div>
            ) : (
              filteredPrescriptions.map((prescription) => (
                <div key={prescription.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{prescription.medication_name}</h3>
                        <Badge variant={
                          prescription.status === 'pending' ? 'secondary' :
                          prescription.status === 'dispensed' ? 'default' : 'outline'
                        }>
                          {prescription.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Patient: {prescription.patient_name}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Dosage:</span> {prescription.dosage}
                        </div>
                        <div>
                          <span className="font-medium">Frequency:</span> {prescription.frequency}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {prescription.duration}
                        </div>
                        <div>
                          <span className="font-medium">Prescribed:</span>{" "}
                          {new Date(prescription.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {prescription.instructions && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Instructions:</span> {prescription.instructions}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {prescription.status === 'pending' && (
                      <Button size="sm" onClick={() => handleDispense(prescription.id)}>
                        <Package className="w-3 h-3 mr-1" />
                        Dispense
                      </Button>
                    )}
                    {prescription.status === 'dispensed' && (
                      <Button size="sm" onClick={() => handleCollect(prescription.id)}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Mark as Collected
                      </Button>
                    )}
                    {prescription.status === 'collected' && (
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Collected on {new Date(prescription.collected_at!).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}