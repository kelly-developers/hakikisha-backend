import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Stethoscope, 
  User, 
  FileText, 
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DoctorAnalysis() {
  const [patients, setPatients] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [analysisData, setAnalysisData] = useState({
    symptoms: "",
    diagnosis: "",
    clinicalNotes: "",
    recommendSurgery: false,
    surgeryType: "",
    surgeryUrgency: "",
    requireLabTests: false,
    labTestsNeeded: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPatients();
    loadAnalyses();
  }, []);

  const loadPatients = () => {
    const stored = localStorage.getItem('cvms_patients') || localStorage.getItem('cardiovascular-patients') || localStorage.getItem('patients');
    if (stored) {
      setPatients(JSON.parse(stored));
    }
  };

  const loadAnalyses = () => {
    const stored = localStorage.getItem('cvms_analyses') || localStorage.getItem('cardiovascular-analyses');
    if (stored) {
      setAnalyses(JSON.parse(stored));
    }
  };

  const getPatientAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getVitalDataByPatient = (patientId: string) => {
    const vitals = JSON.parse(localStorage.getItem('cvms_vital_data') || localStorage.getItem('cardiovascular-vitals') || '[]');
    return vitals.filter((v: any) => v.patient_id === patientId || v.patientId === patientId);
  };

  const handleAnalysisSubmit = async () => {
    if (!selectedPatientId) {
      toast({
        title: "Error",
        description: "Please select a patient",
        variant: "destructive",
      });
      return;
    }

    if (!analysisData.symptoms || !analysisData.diagnosis) {
      toast({
        title: "Error",
        description: "Please enter symptoms and diagnosis",
        variant: "destructive",
      });
      return;
    }

    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    try {
      const newAnalysis = {
        id: Date.now().toString(),
        patient_id: selectedPatientId,
        patient_name: `${selectedPatient?.first_name} ${selectedPatient?.last_name}`,
        doctor_id: 'Dr. Admin',
        symptoms: analysisData.symptoms,
        diagnosis: analysisData.diagnosis,
        clinical_notes: analysisData.clinicalNotes,
        recommend_surgery: analysisData.recommendSurgery,
        surgery_type: analysisData.surgeryType,
        surgery_urgency: analysisData.surgeryUrgency,
        require_lab_tests: analysisData.requireLabTests,
        lab_tests_needed: analysisData.labTestsNeeded,
        status: 'completed',
        created_at: new Date().toISOString()
      };

      const updatedAnalyses = [newAnalysis, ...analyses];
      setAnalyses(updatedAnalyses);
      localStorage.setItem('cvms_analyses', JSON.stringify(updatedAnalyses));
      localStorage.setItem('cardiovascular-analyses', JSON.stringify(updatedAnalyses)); // Keep for backward compatibility

      // If surgery is recommended, add to surgery scheduling
      if (analysisData.recommendSurgery && analysisData.surgeryType) {
        const surgeryData = {
          id: Date.now().toString(),
          patient_id: selectedPatientId,
          patient_name: `${selectedPatient?.first_name} ${selectedPatient?.last_name}`,
          procedure_name: analysisData.surgeryType,
          urgency: analysisData.surgeryUrgency,
          recommended_by: 'Dr. Admin',
          status: 'consent_pending',
          created_at: new Date().toISOString(),
          diagnosis: analysisData.diagnosis
        };
        
        const existingSurgeries = JSON.parse(localStorage.getItem('cvms_surgeries') || localStorage.getItem('cardiovascular-surgeries') || '[]');
        localStorage.setItem('cvms_surgeries', JSON.stringify([surgeryData, ...existingSurgeries]));
        localStorage.setItem('cardiovascular-surgeries', JSON.stringify([surgeryData, ...existingSurgeries])); // Keep for backward compatibility
      }

      // If lab tests are required, create lab test orders
      if (analysisData.requireLabTests && analysisData.labTestsNeeded) {
        const testNames = analysisData.labTestsNeeded.split(',').map(t => t.trim()).filter(t => t);
        const existingTests = JSON.parse(localStorage.getItem('cvms_lab_tests') || '[]');
        
        testNames.forEach(testName => {
          const labTest = {
            id: `test_${Date.now()}_${Math.random()}`,
            patient_id: selectedPatientId,
            patient_name: `${selectedPatient?.first_name} ${selectedPatient?.last_name}`,
            test_type: 'blood',
            test_name: testName,
            ordered_by: 'Dr. Admin',
            ordered_date: new Date().toISOString(),
            status: 'ordered',
            priority: 'routine',
            notes: `Ordered from doctor analysis - ${analysisData.diagnosis}`,
            created_at: new Date().toISOString()
          };
          existingTests.push(labTest);
        });
        
        localStorage.setItem('cvms_lab_tests', JSON.stringify(existingTests));
      }

      let description = "Medical assessment completed successfully";
      if (analysisData.recommendSurgery && analysisData.requireLabTests) {
        description = "Analysis saved, patient added to surgery consent, and lab tests ordered";
      } else if (analysisData.recommendSurgery) {
        description = "Analysis saved and patient added to surgery consent";
      } else if (analysisData.requireLabTests) {
        description = "Analysis saved and lab tests ordered";
      }
      
      toast({
        title: "Analysis Completed",
        description: description,
      });

      // Reset form
      setAnalysisData({
        symptoms: "",
        diagnosis: "",
        clinicalNotes: "",
        recommendSurgery: false,
        surgeryType: "",
        surgeryUrgency: "",
        requireLabTests: false,
        labTestsNeeded: ""
      });
      setSelectedPatientId("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save analysis",
        variant: "destructive",
      });
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const vitalData = selectedPatientId ? getVitalDataByPatient(selectedPatientId) : [];
  const latestVitals = vitalData[vitalData.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Doctor Analysis</h1>
        <p className="text-muted-foreground">
          Medical assessment, diagnosis, and treatment planning
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Selection */}
        <Card className="lg:col-span-1 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Select Patient
            </CardTitle>
            <CardDescription>
              Choose patient for analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient">Patient</Label>
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name} - {patient.patient_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPatient && (
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-semibold text-sm">Patient Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Age:</span>{" "}
                      <span className="font-medium">{getPatientAge(selectedPatient.date_of_birth)} years</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gender:</span>{" "}
                      <span className="font-medium capitalize">{selectedPatient.gender || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Medical History:</span>{" "}
                      <p className="text-foreground mt-1">{selectedPatient.medical_history || 'None recorded'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Allergies:</span>{" "}
                      <p className="text-foreground mt-1">{selectedPatient.allergies || 'None recorded'}</p>
                    </div>
                    {latestVitals && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground">Latest Vitals:</span>
                        <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
                          <div>BP: {latestVitals.bloodPressureSystolic}/{latestVitals.bloodPressureDiastolic}</div>
                          <div>HR: {latestVitals.heartRate} BPM</div>
                          <div>Temp: {latestVitals.temperature}°C</div>
                          <div>O2: {latestVitals.oxygenSaturation}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Analysis Form */}
        <Card className="lg:col-span-2 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Medical Analysis
            </CardTitle>
            <CardDescription>
              Record symptoms, diagnosis, and treatment plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symptoms">Symptoms *</Label>
                <Textarea 
                  id="symptoms"
                  placeholder="Record all patient symptoms: chest pain, shortness of breath, fatigue, palpitations, etc."
                  value={analysisData.symptoms}
                  onChange={(e) => setAnalysisData(prev => ({ ...prev, symptoms: e.target.value }))}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis *</Label>
                <Input 
                  id="diagnosis"
                  placeholder="Enter primary diagnosis"
                  value={analysisData.diagnosis}
                  onChange={(e) => setAnalysisData(prev => ({ ...prev, diagnosis: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicalNotes">Clinical Notes</Label>
                <Textarea 
                  id="clinicalNotes"
                  placeholder="Additional observations, test results, recommendations..."
                  value={analysisData.clinicalNotes}
                  onChange={(e) => setAnalysisData(prev => ({ ...prev, clinicalNotes: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="recommendSurgery"
                    checked={analysisData.recommendSurgery}
                    onCheckedChange={(checked) => setAnalysisData(prev => ({ 
                      ...prev, 
                      recommendSurgery: checked as boolean,
                      surgeryType: checked ? prev.surgeryType : "",
                      surgeryUrgency: checked ? prev.surgeryUrgency : ""
                    }))}
                  />
                  <Label htmlFor="recommendSurgery" className="font-medium cursor-pointer">
                    Recommend Surgery
                  </Label>
                </div>

                {analysisData.recommendSurgery && (
                  <div className="pl-6 space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <Label htmlFor="surgeryType">Surgery Type *</Label>
                      <Select 
                        value={analysisData.surgeryType} 
                        onValueChange={(value) => setAnalysisData(prev => ({ ...prev, surgeryType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select surgery type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Coronary Artery Bypass Grafting (CABG)">Coronary Artery Bypass Grafting (CABG)</SelectItem>
                          <SelectItem value="Heart Valve Replacement">Heart Valve Replacement</SelectItem>
                          <SelectItem value="Angioplasty & Stent Placement">Angioplasty & Stent Placement</SelectItem>
                          <SelectItem value="Pacemaker Installation">Pacemaker Installation</SelectItem>
                          <SelectItem value="Cardiac Ablation">Cardiac Ablation</SelectItem>
                          <SelectItem value="Heart Transplant">Heart Transplant</SelectItem>
                          <SelectItem value="Other Cardiac Surgery">Other Cardiac Surgery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="surgeryUrgency">Surgery Urgency *</Label>
                      <Select 
                        value={analysisData.surgeryUrgency} 
                        onValueChange={(value) => setAnalysisData(prev => ({ ...prev, surgeryUrgency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="emergency">Emergency (0-6 hours)</SelectItem>
                          <SelectItem value="urgent">Urgent (24-48 hours)</SelectItem>
                          <SelectItem value="routine">Routine (1-2 weeks)</SelectItem>
                          <SelectItem value="elective">Elective (1+ months)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="requireLabTests"
                    checked={analysisData.requireLabTests}
                    onCheckedChange={(checked) => setAnalysisData(prev => ({ 
                      ...prev, 
                      requireLabTests: checked as boolean,
                      labTestsNeeded: checked ? prev.labTestsNeeded : ""
                    }))}
                  />
                  <Label htmlFor="requireLabTests" className="font-medium cursor-pointer">
                    Require Lab Tests
                  </Label>
                </div>

                {analysisData.requireLabTests && (
                  <div className="pl-6 space-y-2 animate-in fade-in duration-200">
                    <Label htmlFor="labTestsNeeded">Tests Needed *</Label>
                    <Textarea 
                      id="labTestsNeeded"
                      placeholder="Enter lab tests needed (comma separated): ECG, Blood Test, CT Scan, etc."
                      value={analysisData.labTestsNeeded}
                      onChange={(e) => setAnalysisData(prev => ({ ...prev, labTestsNeeded: e.target.value }))}
                      rows={2}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  className="bg-gradient-medical text-white"
                  onClick={handleAnalysisSubmit}
                  disabled={!selectedPatientId}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Analysis
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setAnalysisData({
                      symptoms: "",
                      diagnosis: "",
                      clinicalNotes: "",
                      recommendSurgery: false,
                      surgeryType: "",
                      surgeryUrgency: "",
                      requireLabTests: false,
                      labTestsNeeded: ""
                    });
                    setSelectedPatientId("");
                  }}
                >
                  Clear Form
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Analyses */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Recent Medical Analyses
          </CardTitle>
          <CardDescription>
            Recently completed patient assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyses.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No analyses recorded yet
              </div>
            ) : (
              analyses.map((analysis) => (
                <div key={analysis.id} className="p-4 bg-background rounded-lg border">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-foreground">
                        {analysis.patient_name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Analyzed by: {analysis.doctor_id} • {new Date(analysis.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {analysis.recommend_surgery && (
                      <Badge variant="destructive">Surgery Recommended</Badge>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Symptoms:</span> {analysis.symptoms}
                    </div>
                    <div>
                      <span className="font-medium">Diagnosis:</span> {analysis.diagnosis}
                    </div>
                    {analysis.clinical_notes && (
                      <div>
                        <span className="font-medium">Clinical Notes:</span> {analysis.clinical_notes}
                      </div>
                    )}
                    {analysis.recommend_surgery && (
                      <>
                        <div>
                          <span className="font-medium">Surgery Type:</span> {analysis.surgery_type}
                        </div>
                        <div>
                          <span className="font-medium">Urgency:</span>{" "}
                          <Badge variant="outline" className="ml-1">
                            {analysis.surgery_urgency}
                          </Badge>
                        </div>
                      </>
                    )}
                    {analysis.require_lab_tests && (
                      <div>
                        <span className="font-medium">Lab Tests Required:</span> {analysis.lab_tests_needed}
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
