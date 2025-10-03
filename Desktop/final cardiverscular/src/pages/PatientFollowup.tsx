import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Activity, 
  User, 
  Calendar, 
  CheckCircle,
  Heart,
  Stethoscope,
  ClipboardCheck,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PatientFollowup() {
  const [activeTab, setActiveTab] = useState("patient-followup");
  const [patients, setPatients] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [surgeries, setSurgeries] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [followupData, setFollowupData] = useState({
    type: "",
    symptoms: "",
    improvements: "",
    concerns: "",
    nextVisitDate: "",
    medicationAdherence: false,
    notes: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const storedPatients = localStorage.getItem('patients');
    const storedFollowups = localStorage.getItem('cardiovascular-followups');
    const storedSurgeries = localStorage.getItem('cardiovascular-surgeries');
    
    if (storedPatients) setPatients(JSON.parse(storedPatients));
    if (storedFollowups) setFollowups(JSON.parse(storedFollowups));
    if (storedSurgeries) setSurgeries(JSON.parse(storedSurgeries));
  };

  const handleFollowupSubmit = () => {
    if (!selectedPatientId) {
      toast({
        title: "Error",
        description: "Please select a patient",
        variant: "destructive",
      });
      return;
    }

    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    const newFollowup = {
      id: Date.now().toString(),
      patient_id: selectedPatientId,
      patient_name: `${selectedPatient?.first_name} ${selectedPatient?.last_name}`,
      type: followupData.type,
      symptoms: followupData.symptoms,
      improvements: followupData.improvements,
      concerns: followupData.concerns,
      next_visit_date: followupData.nextVisitDate,
      medication_adherence: followupData.medicationAdherence,
      notes: followupData.notes,
      created_at: new Date().toISOString()
    };

    const updatedFollowups = [newFollowup, ...followups];
    setFollowups(updatedFollowups);
    localStorage.setItem('cardiovascular-followups', JSON.stringify(updatedFollowups));

    toast({
      title: "Follow-up Recorded",
      description: "Patient follow-up has been saved successfully",
    });

    // Reset form
    setFollowupData({
      type: "",
      symptoms: "",
      improvements: "",
      concerns: "",
      nextVisitDate: "",
      medicationAdherence: false,
      notes: ""
    });
    setSelectedPatientId("");
  };

  const scheduledSurgeries = surgeries.filter(s => s.status === 'scheduled' || s.status === 'in_progress');
  const completedSurgeries = surgeries.filter(s => s.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Patient Follow-up & Surgery Tracking</h1>
        <p className="text-muted-foreground">
          Track patient progress, follow-up visits, and surgical procedures
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patient-followup">Patient Follow-up</TabsTrigger>
          <TabsTrigger value="surgery-tracking">Surgery Tracking</TabsTrigger>
          <TabsTrigger value="who-standards">WHO Standards</TabsTrigger>
        </TabsList>

        {/* Patient Follow-up Tab */}
        <TabsContent value="patient-followup" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Record Follow-up Visit
                </CardTitle>
                <CardDescription>
                  Document patient progress and post-treatment status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient">Select Patient</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="followupType">Follow-up Type</Label>
                    <Select 
                      value={followupData.type} 
                      onValueChange={(value) => setFollowupData({...followupData, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="post-surgery">Post-Surgery</SelectItem>
                        <SelectItem value="medication-review">Medication Review</SelectItem>
                        <SelectItem value="routine-checkup">Routine Checkup</SelectItem>
                        <SelectItem value="complication-assessment">Complication Assessment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symptoms">Current Symptoms</Label>
                    <Textarea 
                      id="symptoms"
                      placeholder="Any new or ongoing symptoms..."
                      value={followupData.symptoms}
                      onChange={(e) => setFollowupData({...followupData, symptoms: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="improvements">Improvements Noted</Label>
                    <Textarea 
                      id="improvements"
                      placeholder="Patient improvements since last visit..."
                      value={followupData.improvements}
                      onChange={(e) => setFollowupData({...followupData, improvements: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="concerns">Concerns or Complications</Label>
                    <Textarea 
                      id="concerns"
                      placeholder="Any concerns or complications..."
                      value={followupData.concerns}
                      onChange={(e) => setFollowupData({...followupData, concerns: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="medicationAdherence"
                      checked={followupData.medicationAdherence}
                      onCheckedChange={(checked) => setFollowupData({...followupData, medicationAdherence: checked as boolean})}
                    />
                    <Label htmlFor="medicationAdherence" className="cursor-pointer">
                      Patient is adhering to medication regimen
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nextVisitDate">Next Visit Date</Label>
                    <Input 
                      id="nextVisitDate"
                      type="date"
                      value={followupData.nextVisitDate}
                      onChange={(e) => setFollowupData({...followupData, nextVisitDate: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea 
                      id="notes"
                      placeholder="Other observations or instructions..."
                      value={followupData.notes}
                      onChange={(e) => setFollowupData({...followupData, notes: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <Button 
                    className="w-full bg-gradient-medical text-white"
                    onClick={handleFollowupSubmit}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Record Follow-up
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Recent Follow-ups
                </CardTitle>
                <CardDescription>
                  Latest patient follow-up records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {followups.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No follow-up records yet
                    </div>
                  ) : (
                    followups.map((followup) => (
                      <div key={followup.id} className="p-4 bg-background rounded-lg border">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium">{followup.patient_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(followup.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge variant="outline">{followup.type}</Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          {followup.symptoms && (
                            <div><strong>Symptoms:</strong> {followup.symptoms}</div>
                          )}
                          {followup.improvements && (
                            <div><strong>Improvements:</strong> {followup.improvements}</div>
                          )}
                          {followup.concerns && (
                            <div className="text-warning"><strong>Concerns:</strong> {followup.concerns}</div>
                          )}
                          <div>
                            <strong>Medication Adherence:</strong> {followup.medication_adherence ? '✓ Yes' : '✗ No'}
                          </div>
                          {followup.next_visit_date && (
                            <div><strong>Next Visit:</strong> {followup.next_visit_date}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Surgery Tracking Tab */}
        <TabsContent value="surgery-tracking" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Scheduled Surgeries
                </CardTitle>
                <CardDescription>
                  Upcoming and in-progress procedures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduledSurgeries.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No scheduled surgeries
                    </div>
                  ) : (
                    scheduledSurgeries.map((surgery) => (
                      <div key={surgery.id} className="p-4 bg-background rounded-lg border">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium">{surgery.patient_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {surgery.procedure_name}
                            </div>
                          </div>
                          <Badge variant={surgery.status === 'in_progress' ? 'default' : 'secondary'}>
                            {surgery.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <div><strong>Urgency:</strong> {surgery.urgency}</div>
                          <div><strong>Surgeon:</strong> {surgery.surgeon_name || 'TBD'}</div>
                          {surgery.scheduled_date && (
                            <div><strong>Date:</strong> {new Date(surgery.scheduled_date).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  Completed Surgeries
                </CardTitle>
                <CardDescription>
                  Successfully completed procedures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {completedSurgeries.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No completed surgeries
                    </div>
                  ) : (
                    completedSurgeries.map((surgery) => (
                      <div key={surgery.id} className="p-4 bg-background rounded-lg border">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium">{surgery.patient_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {surgery.procedure_name}
                            </div>
                          </div>
                          <Badge className="bg-success text-success-foreground">Completed</Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <div><strong>Date:</strong> {surgery.completed_date ? new Date(surgery.completed_date).toLocaleString() : 'N/A'}</div>
                          <div><strong>Surgeon:</strong> {surgery.surgeon_name || 'Unknown'}</div>
                          {surgery.duration_minutes && (
                            <div><strong>Duration:</strong> {surgery.duration_minutes} min</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* WHO Standards Tab */}
        <TabsContent value="who-standards" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                WHO Surgical Safety Standards
              </CardTitle>
              <CardDescription>
                World Health Organization surgical safety checklist compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Before Induction of Anaesthesia</h3>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm">Patient identity confirmed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm">Site marked/not applicable</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm">Anaesthesia safety check completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm">Patient allergies known</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Before Skin Incision</h3>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm">Team members introduced</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm">Procedure confirmed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm">Anticipated critical events reviewed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm">Antibiotic prophylaxis given</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Before Patient Leaves Operating Room</h3>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm">Procedure recorded</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm">Instrument, sponge and needle counts correct</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm">Specimens labeled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm">Key concerns for recovery addressed</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg mt-6">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> All cardiovascular surgeries must comply with WHO Surgical Safety Checklist standards. Regular audits are conducted to ensure compliance and patient safety.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
