import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileText, Table } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  useLocalPatients, 
  useLocalVitalData, 
  useLocalAppointments, 
  useLocalAnalysis, 
  useLocalPrescriptions 
} from "@/hooks/useLocalStorage";
import { exportToCSV, exportToPDF, PatientReport } from "@/utils/exportUtils";

export default function ExportData() {
  const [selectedPatient, setSelectedPatient] = useState("");
  const [exportType, setExportType] = useState("");
  const { toast } = useToast();
  
  const { patients } = useLocalPatients();
  const { getVitalDataByPatient } = useLocalVitalData();
  const { appointments } = useLocalAppointments();
  const { getAnalysesByPatient } = useLocalAnalysis();
  const { getPrescriptionsByPatient } = useLocalPrescriptions();

  const generatePatientReport = (patientId: string): PatientReport | null => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return null;

    // Get all prescriptions (from both old and new format)
    const allPrescriptions = JSON.parse(localStorage.getItem('cvms_prescriptions') || '[]');
    const patientPrescriptions = allPrescriptions.filter((p: any) => p.patient_id === patientId);

    return {
      patient,
      vitalData: getVitalDataByPatient(patientId),
      appointments: appointments.filter(a => a.patient_id === patientId),
      analyses: getAnalysesByPatient(patientId),
      prescriptions: patientPrescriptions
    };
  };

  const generateAllPatientsReport = (): PatientReport[] => {
    return patients.map(patient => {
      const allPrescriptions = JSON.parse(localStorage.getItem('cvms_prescriptions') || '[]');
      const patientPrescriptions = allPrescriptions.filter((p: any) => p.patient_id === patient.id);
      
      return {
        patient,
        vitalData: getVitalDataByPatient(patient.id),
        appointments: appointments.filter(a => a.patient_id === patient.id),
        analyses: getAnalysesByPatient(patient.id),
        prescriptions: patientPrescriptions
      };
    });
  };

  const handleExport = () => {
    if (!exportType) {
      toast({
        title: "Error",
        description: "Please select an export format",
        variant: "destructive",
      });
      return;
    }

    try {
      let data: PatientReport[] = [];
      let filename = "";

      if (selectedPatient === "all") {
        data = generateAllPatientsReport();
        filename = `all_patients_report_${new Date().toISOString().split('T')[0]}`;
      } else if (selectedPatient) {
        const patientReport = generatePatientReport(selectedPatient);
        if (patientReport) {
          data = [patientReport];
          filename = `${patientReport.patient.first_name}_${patientReport.patient.last_name}_report_${new Date().toISOString().split('T')[0]}`;
        }
      } else {
        toast({
          title: "Error",
          description: "Please select a patient or 'All Patients'",
          variant: "destructive",
        });
        return;
      }

      if (data.length === 0) {
        toast({
          title: "Error",
          description: "No data to export",
          variant: "destructive",
        });
        return;
      }

      if (exportType === "pdf") {
        exportToPDF(data, `${filename}.pdf`);
      } else if (exportType === "csv") {
        exportToCSV(data, `${filename}.csv`);
      }

      toast({
        title: "Export Successful",
        description: `Data exported as ${exportType.toUpperCase()} successfully`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          Export Patient Data
        </CardTitle>
        <CardDescription>
          Export patient records, vital signs, appointments, and analyses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="patient-select">Select Patient</Label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger>
                <SelectValue placeholder="Choose patient or all patients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name} - {patient.patient_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-type">Export Format</Label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    PDF Report
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    CSV Data
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Export Contents</Label>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>• Patient demographics and contact information</div>
            <div>• Medical history, allergies, and current medications</div>
            <div>• Complete vital signs history with timestamps</div>
            <div>• Appointment history and scheduling details</div>
            <div>• Doctor analyses, diagnoses, and recommendations</div>
            <div>• Prescription records and medication details</div>
          </div>
        </div>

        <Button 
          onClick={handleExport}
          className="w-full bg-gradient-medical text-white"
          disabled={!selectedPatient || !exportType}
        >
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </CardContent>
    </Card>
  );
}