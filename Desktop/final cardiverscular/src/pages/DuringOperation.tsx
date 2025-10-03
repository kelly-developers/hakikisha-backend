import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Activity, Clock, AlertTriangle, Heart, Droplet, Plus, Save, FileText, User, Scissors, CheckCircle, XCircle, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OperationMonitoring {
  id: string;
  patient_id: string;
  patient_name: string;
  procedure_name: string;
  surgeon: string;
  start_time: string;
  end_time?: string;
  status: 'in-progress' | 'completed' | 'emergency';
  vitals: {
    heart_rate: number;
    blood_pressure: string;
    oxygen_saturation: number;
    temperature: number;
    blood_loss: number;
    urine_output: number;
  };
  equipment_check: EquipmentCheck;
  surgical_notes: SurgicalNote[];
  complications: Complication[];
  medications: Medication[];
  outcomes: Outcome[];
  surgical_goals: SurgicalGoal[];
  closure_checklist: ClosureChecklist;
  created_at: string;
}

interface EquipmentCheck {
  anesthesia_machine: boolean;
  monitoring_equipment: boolean;
  surgical_instruments: boolean;
  implants_available: boolean;
  emergency_equipment: boolean;
  blood_products: boolean;
  medications_ready: boolean;
  imaging_available: boolean;
  notes: string;
}

interface SurgicalNote {
  id: string;
  timestamp: string;
  note: string;
  type: 'incision' | 'dissection' | 'repair' | 'closure' | 'other';
  surgeon: string;
}

interface Complication {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  resolved: boolean;
}

interface Medication {
  id: string;
  timestamp: string;
  name: string;
  dosage: string;
  route: string;
  administered_by: string;
}

interface Outcome {
  id: string;
  type: string;
  description: string;
  success: boolean;
  notes: string;
}

interface SurgicalGoal {
  id: string;
  description: string;
  achieved: boolean;
  notes: string;
}

interface ClosureChecklist {
  sponge_count_correct: boolean;
  instrument_count_correct: boolean;
  specimens_labeled: boolean;
  dressing_applied: boolean;
  patient_stable: boolean;
  report_given: boolean;
  notes: string;
}

export default function DuringOperation() {
  const [operations, setOperations] = useState<OperationMonitoring[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [newOperation, setNewOperation] = useState({
    surgeon: "",
    procedure_name: ""
  });
  const [currentOperation, setCurrentOperation] = useState<OperationMonitoring | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [newVitals, setNewVitals] = useState({
    heart_rate: 80,
    blood_pressure: "120/80",
    oxygen_saturation: 98,
    temperature: 37.0,
    blood_loss: 0,
    urine_output: 0
  });
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("incision");
  const [newComplication, setNewComplication] = useState({
    type: "",
    description: "",
    severity: "mild" as 'mild' | 'moderate' | 'severe'
  });
  const [newMedication, setNewMedication] = useState({
    name: "",
    dosage: "",
    route: "iv"
  });
  const [newOutcome, setNewOutcome] = useState({
    type: "",
    description: "",
    success: true,
    notes: ""
  });
  const [newGoal, setNewGoal] = useState({
    description: "",
    notes: ""
  });
  const [equipmentCheck, setEquipmentCheck] = useState<EquipmentCheck>({
    anesthesia_machine: false,
    monitoring_equipment: false,
    surgical_instruments: false,
    implants_available: false,
    emergency_equipment: false,
    blood_products: false,
    medications_ready: false,
    imaging_available: false,
    notes: ""
  });
  const [closureChecklist, setClosureChecklist] = useState<ClosureChecklist>({
    sponge_count_correct: false,
    instrument_count_correct: false,
    specimens_labeled: false,
    dressing_applied: false,
    patient_stable: false,
    report_given: false,
    notes: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // Simulate real-time monitoring
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    try {
      // Load operations
      const storedOperations = localStorage.getItem('cvms_during_operations');
      if (storedOperations) {
        const parsed = JSON.parse(storedOperations);
        setOperations(Array.isArray(parsed) ? parsed : []);
      } else {
        setOperations([]);
      }

      // Load patients and pre-op checklists to find patients ready for surgery
      const storedPatients = localStorage.getItem('cvms_patients') || localStorage.getItem('cardiovascular-patients') || localStorage.getItem('patients');
      if (storedPatients) {
        const parsedPatients = JSON.parse(storedPatients);
        setPatients(Array.isArray(parsedPatients) ? parsedPatients : []);
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setOperations([]);
      setPatients([]);
    }
  };

  // Get patients who have completed pre-op checklist
  const getPatientsReadyForSurgery = () => {
    try {
      const preopChecklists = JSON.parse(localStorage.getItem('cvms_preop_checklists') || '[]');
      const surgeries = JSON.parse(localStorage.getItem('cardiovascular-surgeries') || '[]');
      
      const readyPatientIds = new Set(
        preopChecklists
          .filter((checklist: any) => checklist?.status === 'completed')
          .map((checklist: any) => checklist?.patient_id)
      );

      // Also check if they have approved consent
      const consentedSurgeries = surgeries.filter((s: any) => 
        s?.status === 'scheduled' || s?.status === 'consent_approved'
      );
      const consentedPatientIds = new Set(consentedSurgeries.map((s: any) => s?.patient_id));

      return patients.filter(patient => 
        readyPatientIds.has(patient?.id) && consentedPatientIds.has(patient?.id)
      );
    } catch (error) {
      console.error('Error getting patients ready for surgery:', error);
      return [];
    }
  };

  const startNewOperation = () => {
    if (!selectedPatient || !newOperation.surgeon || !newOperation.procedure_name) {
      toast({
        title: "Missing information",
        description: "Please select a patient and enter surgeon/procedure details",
        variant: "destructive",
      });
      return;
    }

    // Check if all critical equipment is verified
    const criticalEquipmentVerified = 
      equipmentCheck.anesthesia_machine &&
      equipmentCheck.monitoring_equipment &&
      equipmentCheck.surgical_instruments &&
      equipmentCheck.emergency_equipment;

    if (!criticalEquipmentVerified) {
      toast({
        title: "Equipment Check Required",
        description: "Please verify all critical equipment before starting surgery",
        variant: "destructive",
      });
      return;
    }

    const patient = patients.find(p => p.id === selectedPatient);
    if (!patient) {
      toast({
        title: "Patient not found",
        description: "Selected patient not found in records",
        variant: "destructive",
      });
      return;
    }

    const operation: OperationMonitoring = {
      id: `op_${Date.now()}`,
      patient_id: selectedPatient,
      patient_name: `${patient?.first_name} ${patient?.last_name}`,
      procedure_name: newOperation.procedure_name,
      surgeon: newOperation.surgeon,
      start_time: new Date().toISOString(),
      status: 'in-progress',
      vitals: { ...newVitals },
      equipment_check: { ...equipmentCheck },
      surgical_notes: [],
      complications: [],
      medications: [],
      outcomes: [],
      surgical_goals: [],
      closure_checklist: {
        sponge_count_correct: false,
        instrument_count_correct: false,
        specimens_labeled: false,
        dressing_applied: false,
        patient_stable: false,
        report_given: false,
        notes: ""
      },
      created_at: new Date().toISOString(),
    };

    const updatedOperations = [...operations, operation];
    setOperations(updatedOperations);
    localStorage.setItem('cvms_during_operations', JSON.stringify(updatedOperations));
    setCurrentOperation(operation);

    // Update surgery status
    try {
      const surgeries = JSON.parse(localStorage.getItem('cardiovascular-surgeries') || '[]');
      const updatedSurgeries = surgeries.map((surgery: any) => {
        if (surgery.patient_id === selectedPatient) {
          return {
            ...surgery,
            status: 'in-progress',
            operation_start_time: new Date().toISOString()
          };
        }
        return surgery;
      });
      localStorage.setItem('cardiovascular-surgeries', JSON.stringify(updatedSurgeries));
    } catch (error) {
      console.error('Error updating surgery status:', error);
    }

    toast({
      title: "Operation Started",
      description: `Surgery started for ${patient?.first_name} ${patient?.last_name}`,
    });

    // Reset form
    setSelectedPatient("");
    setNewOperation({ surgeon: "", procedure_name: "" });
    setEquipmentCheck({
      anesthesia_machine: false,
      monitoring_equipment: false,
      surgical_instruments: false,
      implants_available: false,
      emergency_equipment: false,
      blood_products: false,
      medications_ready: false,
      imaging_available: false,
      notes: ""
    });
  };

  const updateVitals = (operationId: string) => {
    const updatedOperations = operations.map(op => {
      if (op.id === operationId) {
        return {
          ...op,
          vitals: { ...newVitals }
        };
      }
      return op;
    });
    setOperations(updatedOperations);
    localStorage.setItem('cvms_during_operations', JSON.stringify(updatedOperations));
    
    toast({
      title: "Vitals Updated",
      description: "Patient vitals have been updated",
    });
  };

  const addSurgicalNote = (operationId: string) => {
    if (!newNote.trim()) return;

    const note: SurgicalNote = {
      id: `note_${Date.now()}`,
      timestamp: new Date().toISOString(),
      note: newNote,
      type: noteType as any,
      surgeon: currentOperation?.surgeon || "Current Surgeon"
    };

    const updatedOperations = operations.map(op => {
      if (op.id === operationId) {
        return {
          ...op,
          surgical_notes: [...(op.surgical_notes || []), note]
        };
      }
      return op;
    });
    setOperations(updatedOperations);
    localStorage.setItem('cvms_during_operations', JSON.stringify(updatedOperations));
    setNewNote("");
    
    toast({
      title: "Note Added",
      description: "Surgical note has been recorded",
    });
  };

  const addComplication = (operationId: string) => {
    if (!newComplication.type || !newComplication.description) return;

    const complication: Complication = {
      id: `comp_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: newComplication.type,
      description: newComplication.description,
      severity: newComplication.severity,
      resolved: false
    };

    const updatedOperations = operations.map(op => {
      if (op.id === operationId) {
        return {
          ...op,
          complications: [...(op.complications || []), complication]
        };
      }
      return op;
    });
    setOperations(updatedOperations);
    localStorage.setItem('cvms_during_operations', JSON.stringify(updatedOperations));
    setNewComplication({ type: "", description: "", severity: "mild" });
    
    toast({
      title: "Complication Recorded",
      description: "Surgical complication has been documented",
    });
  };

  const addMedication = (operationId: string) => {
    if (!newMedication.name || !newMedication.dosage) return;

    const medication: Medication = {
      id: `med_${Date.now()}`,
      timestamp: new Date().toISOString(),
      name: newMedication.name,
      dosage: newMedication.dosage,
      route: newMedication.route,
      administered_by: currentOperation?.surgeon || "Current Surgeon"
    };

    const updatedOperations = operations.map(op => {
      if (op.id === operationId) {
        return {
          ...op,
          medications: [...(op.medications || []), medication]
        };
      }
      return op;
    });
    setOperations(updatedOperations);
    localStorage.setItem('cvms_during_operations', JSON.stringify(updatedOperations));
    setNewMedication({ name: "", dosage: "", route: "iv" });
    
    toast({
      title: "Medication Recorded",
      description: "Medication administration has been documented",
    });
  };

  const addOutcome = (operationId: string) => {
    if (!newOutcome.type || !newOutcome.description) return;

    const outcome: Outcome = {
      id: `out_${Date.now()}`,
      type: newOutcome.type,
      description: newOutcome.description,
      success: newOutcome.success,
      notes: newOutcome.notes
    };

    const updatedOperations = operations.map(op => {
      if (op.id === operationId) {
        return {
          ...op,
          outcomes: [...(op.outcomes || []), outcome]
        };
      }
      return op;
    });
    setOperations(updatedOperations);
    localStorage.setItem('cvms_during_operations', JSON.stringify(updatedOperations));
    setNewOutcome({ type: "", description: "", success: true, notes: "" });
    
    toast({
      title: "Outcome Recorded",
      description: "Surgical outcome has been documented",
    });
  };

  const addSurgicalGoal = (operationId: string) => {
    if (!newGoal.description.trim()) return;

    const goal: SurgicalGoal = {
      id: `goal_${Date.now()}`,
      description: newGoal.description,
      achieved: false,
      notes: newGoal.notes
    };

    const updatedOperations = operations.map(op => {
      if (op.id === operationId) {
        return {
          ...op,
          surgical_goals: [...(op.surgical_goals || []), goal]
        };
      }
      return op;
    });
    setOperations(updatedOperations);
    localStorage.setItem('cvms_during_operations', JSON.stringify(updatedOperations));
    setNewGoal({ description: "", notes: "" });
    
    toast({
      title: "Goal Added",
      description: "Surgical goal has been added",
    });
  };

  const toggleGoalAchievement = (operationId: string, goalId: string) => {
    const updatedOperations = operations.map(op => {
      if (op.id === operationId) {
        return {
          ...op,
          surgical_goals: (op.surgical_goals || []).map(goal => 
            goal.id === goalId ? { ...goal, achieved: !goal.achieved } : goal
          )
        };
      }
      return op;
    });
    setOperations(updatedOperations);
    localStorage.setItem('cvms_during_operations', JSON.stringify(updatedOperations));
  };

  const completeOperation = (operationId: string) => {
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return;

    // Check if all closure checklist items are completed
    const allClosureItemsCompleted = 
      closureChecklist.sponge_count_correct &&
      closureChecklist.instrument_count_correct &&
      closureChecklist.specimens_labeled &&
      closureChecklist.dressing_applied &&
      closureChecklist.patient_stable &&
      closureChecklist.report_given;

    if (!allClosureItemsCompleted) {
      toast({
        title: "Closure Checklist Incomplete",
        description: "Please complete all closure checklist items before ending surgery",
        variant: "destructive",
      });
      return;
    }

    const updatedOperations = operations.map(op => {
      if (op.id === operationId) {
        return {
          ...op,
          status: 'completed' as const,
          end_time: new Date().toISOString(),
          closure_checklist: { ...closureChecklist }
        };
      }
      return op;
    });
    setOperations(updatedOperations);
    localStorage.setItem('cvms_during_operations', JSON.stringify(updatedOperations));

    // Update surgery status
    try {
      const surgeries = JSON.parse(localStorage.getItem('cardiovascular-surgeries') || '[]');
      const updatedSurgeries = surgeries.map((surgery: any) => {
        if (surgery.patient_id === operation.patient_id) {
          return {
            ...surgery,
            status: 'completed',
            operation_end_time: new Date().toISOString(),
            surgical_outcomes: operation.outcomes || [],
            goals_achieved: (operation.surgical_goals || []).filter(g => g.achieved).length,
            total_goals: (operation.surgical_goals || []).length
          };
        }
        return surgery;
      });
      localStorage.setItem('cardiovascular-surgeries', JSON.stringify(updatedSurgeries));
    } catch (error) {
      console.error('Error updating surgery completion:', error);
    }

    setShowCompletionModal(false);
    setCurrentOperation(null);
    
    toast({
      title: "Operation Completed Successfully",
      description: "Surgery has been completed and all documentation saved",
    });
  };

  // Safe array accessors
  const activeOperations = operations.filter(op => op?.status === 'in-progress');
  const patientsReadyForSurgery = getPatientsReadyForSurgery();

  const allCriticalEquipmentVerified = 
    equipmentCheck.anesthesia_machine &&
    equipmentCheck.monitoring_equipment &&
    equipmentCheck.surgical_instruments &&
    equipmentCheck.emergency_equipment;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">During Operation</h1>
        <p className="text-muted-foreground">
          Real-time intra-operative monitoring and documentation
        </p>
      </div>

      {/* Start New Operation */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            Start New Operation
          </CardTitle>
          <CardDescription>Begin monitoring for a patient who has completed pre-op</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient and Procedure Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Patient *</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient ready for surgery" />
                </SelectTrigger>
                <SelectContent>
                  {patientsReadyForSurgery.length === 0 ? (
                    <SelectItem value="no-patients" disabled>
                      No patients ready for surgery
                    </SelectItem>
                  ) : (
                    patientsReadyForSurgery.map((patient) => (
                      <SelectItem key={patient?.id} value={patient?.id}>
                        {patient?.first_name} {patient?.last_name} - {patient?.patient_id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {patientsReadyForSurgery.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Patients must complete pre-operative checklist first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="surgeon">Surgeon *</Label>
              <Input
                id="surgeon"
                placeholder="Enter surgeon name"
                value={newOperation.surgeon}
                onChange={(e) => setNewOperation({...newOperation, surgeon: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="procedure">Procedure *</Label>
              <Input
                id="procedure"
                placeholder="Enter procedure name"
                value={newOperation.procedure_name}
                onChange={(e) => setNewOperation({...newOperation, procedure_name: e.target.value})}
              />
            </div>
          </div>

          {/* Equipment Verification */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Equipment Verification *</Label>
              {allCriticalEquipmentVerified && (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  All Critical Equipment Verified
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={equipmentCheck.anesthesia_machine}
                  onCheckedChange={(checked) => setEquipmentCheck({...equipmentCheck, anesthesia_machine: checked as boolean})}
                />
                <Label className="text-sm">Anesthesia Machine</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={equipmentCheck.monitoring_equipment}
                  onCheckedChange={(checked) => setEquipmentCheck({...equipmentCheck, monitoring_equipment: checked as boolean})}
                />
                <Label className="text-sm">Monitoring Equipment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={equipmentCheck.surgical_instruments}
                  onCheckedChange={(checked) => setEquipmentCheck({...equipmentCheck, surgical_instruments: checked as boolean})}
                />
                <Label className="text-sm">Surgical Instruments</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={equipmentCheck.emergency_equipment}
                  onCheckedChange={(checked) => setEquipmentCheck({...equipmentCheck, emergency_equipment: checked as boolean})}
                />
                <Label className="text-sm">Emergency Equipment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={equipmentCheck.implants_available}
                  onCheckedChange={(checked) => setEquipmentCheck({...equipmentCheck, implants_available: checked as boolean})}
                />
                <Label className="text-sm">Implants Available</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={equipmentCheck.blood_products}
                  onCheckedChange={(checked) => setEquipmentCheck({...equipmentCheck, blood_products: checked as boolean})}
                />
                <Label className="text-sm">Blood Products</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={equipmentCheck.medications_ready}
                  onCheckedChange={(checked) => setEquipmentCheck({...equipmentCheck, medications_ready: checked as boolean})}
                />
                <Label className="text-sm">Medications Ready</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={equipmentCheck.imaging_available}
                  onCheckedChange={(checked) => setEquipmentCheck({...equipmentCheck, imaging_available: checked as boolean})}
                />
                <Label className="text-sm">Imaging Available</Label>
              </div>
            </div>
            <Textarea
              placeholder="Additional equipment notes..."
              value={equipmentCheck.notes}
              onChange={(e) => setEquipmentCheck({...equipmentCheck, notes: e.target.value})}
              rows={2}
            />
          </div>

          <Button 
            onClick={startNewOperation} 
            className="w-full"
            disabled={!selectedPatient || !newOperation.surgeon || !newOperation.procedure_name || !allCriticalEquipmentVerified}
          >
            <Plus className="w-4 h-4 mr-2" />
            Start Operation
          </Button>
        </CardContent>
      </Card>

      {/* Active Operations */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Active Operations
          </CardTitle>
          <CardDescription>Live monitoring of ongoing surgical procedures</CardDescription>
        </CardHeader>
        <CardContent>
          {activeOperations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No active operations</p>
              <p className="text-sm">Start an operation to begin monitoring</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeOperations.map((operation) => (
                <div key={operation.id} className="border rounded-lg p-6 space-y-6">
                  {/* Operation Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{operation.patient_name}</h3>
                      <p className="text-muted-foreground">{operation.procedure_name}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span>Surgeon: {operation.surgeon}</span>
                        <span>Started: {new Date(operation.start_time).toLocaleTimeString()}</span>
                        <Badge variant="destructive" className="animate-pulse">
                          IN PROGRESS
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        setCurrentOperation(operation);
                        setShowCompletionModal(true);
                      }}
                      variant="outline"
                    >
                      Complete Operation
                    </Button>
                  </div>

                  {/* Surgical Goals */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Surgical Goals
                    </h4>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add surgical goal..."
                        value={newGoal.description}
                        onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                      />
                      <Textarea
                        placeholder="Goal notes..."
                        value={newGoal.notes}
                        onChange={(e) => setNewGoal({...newGoal, notes: e.target.value})}
                        className="flex-1"
                        rows={1}
                      />
                      <Button onClick={() => addSurgicalGoal(operation.id)}>
                        Add Goal
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(operation.surgical_goals || []).map((goal) => (
                        <div key={goal.id} className="flex items-center space-x-3 p-2 bg-muted rounded">
                          <Checkbox
                            checked={goal.achieved}
                            onCheckedChange={() => toggleGoalAchievement(operation.id, goal.id)}
                          />
                          <div className="flex-1">
                            <p className={`font-medium ${goal.achieved ? 'text-green-600 line-through' : ''}`}>
                              {goal.description}
                            </p>
                            {goal.notes && <p className="text-sm text-muted-foreground">{goal.notes}</p>}
                          </div>
                          <Badge variant={goal.achieved ? 'default' : 'outline'}>
                            {goal.achieved ? 'Achieved' : 'Pending'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vitals Monitoring */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="space-y-2">
                      <Label>Heart Rate</Label>
                      <Input
                        type="number"
                        value={newVitals.heart_rate}
                        onChange={(e) => setNewVitals({...newVitals, heart_rate: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>BP</Label>
                      <Input
                        value={newVitals.blood_pressure}
                        onChange={(e) => setNewVitals({...newVitals, blood_pressure: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SpO₂</Label>
                      <Input
                        type="number"
                        value={newVitals.oxygen_saturation}
                        onChange={(e) => setNewVitals({...newVitals, oxygen_saturation: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Temp (°C)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newVitals.temperature}
                        onChange={(e) => setNewVitals({...newVitals, temperature: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Blood Loss (ml)</Label>
                      <Input
                        type="number"
                        value={newVitals.blood_loss}
                        onChange={(e) => setNewVitals({...newVitals, blood_loss: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Urine Output (ml)</Label>
                      <Input
                        type="number"
                        value={newVitals.urine_output}
                        onChange={(e) => setNewVitals({...newVitals, urine_output: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <Button onClick={() => updateVitals(operation.id)} size="sm">
                    Update Vitals
                  </Button>

                  {/* Surgical Notes */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Surgical Notes</h4>
                    <div className="flex gap-2">
                      <Select value={noteType} onValueChange={setNoteType}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="incision">Incision</SelectItem>
                          <SelectItem value="dissection">Dissection</SelectItem>
                          <SelectItem value="repair">Repair</SelectItem>
                          <SelectItem value="closure">Closure</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Enter surgical note..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                      />
                      <Button onClick={() => addSurgicalNote(operation.id)}>
                        Add Note
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(operation.surgical_notes || []).map((note) => (
                        <div key={note.id} className="text-sm p-2 bg-muted rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">{note.type}</span>
                            <span className="text-muted-foreground">
                              {new Date(note.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p>{note.note}</p>
                          <p className="text-xs text-muted-foreground">- {note.surgeon}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Complications */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Complications</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <Input
                        placeholder="Type"
                        value={newComplication.type}
                        onChange={(e) => setNewComplication({...newComplication, type: e.target.value})}
                      />
                      <Input
                        placeholder="Description"
                        value={newComplication.description}
                        onChange={(e) => setNewComplication({...newComplication, description: e.target.value})}
                      />
                      <Select 
                        value={newComplication.severity} 
                        onValueChange={(value: 'mild' | 'moderate' | 'severe') => 
                          setNewComplication({...newComplication, severity: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mild">Mild</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="severe">Severe</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={() => addComplication(operation.id)}>
                        Add Complication
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(operation.complications || []).map((comp) => (
                        <div key={comp.id} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                          <div className="flex justify-between">
                            <span className="font-medium text-red-800">{comp.type}</span>
                            <Badge variant={comp.severity === 'severe' ? 'destructive' : 'secondary'}>
                              {comp.severity}
                            </Badge>
                          </div>
                          <p className="text-red-700">{comp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Medications */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Medications</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <Input
                        placeholder="Medication name"
                        value={newMedication.name}
                        onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                      />
                      <Input
                        placeholder="Dosage"
                        value={newMedication.dosage}
                        onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                      />
                      <Select 
                        value={newMedication.route} 
                        onValueChange={(value) => setNewMedication({...newMedication, route: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iv">IV</SelectItem>
                          <SelectItem value="im">IM</SelectItem>
                          <SelectItem value="oral">Oral</SelectItem>
                          <SelectItem value="topical">Topical</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={() => addMedication(operation.id)}>
                        Add Medication
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(operation.medications || []).map((med) => (
                        <div key={med.id} className="text-sm p-2 bg-blue-50 border border-blue-200 rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">{med.name}</span>
                            <span className="text-muted-foreground">
                              {new Date(med.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p>{med.dosage} via {med.route}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Outcomes */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Surgical Outcomes</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <Input
                          placeholder="Outcome type"
                          value={newOutcome.type}
                          onChange={(e) => setNewOutcome({...newOutcome, type: e.target.value})}
                        />
                        <Input
                          placeholder="Description"
                          value={newOutcome.description}
                          onChange={(e) => setNewOutcome({...newOutcome, description: e.target.value})}
                        />
                        <Select 
                          value={newOutcome.success.toString()} 
                          onValueChange={(value) => setNewOutcome({...newOutcome, success: value === 'true'})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Successful</SelectItem>
                            <SelectItem value="false">Unsuccessful</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={() => addOutcome(operation.id)}>
                          Add Outcome
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Additional notes"
                        value={newOutcome.notes}
                        onChange={(e) => setNewOutcome({...newOutcome, notes: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      {(operation.outcomes || []).map((outcome) => (
                        <div key={outcome.id} className={`text-sm p-2 rounded border ${
                          outcome.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className="flex justify-between">
                            <span className="font-medium">{outcome.type}</span>
                            <Badge variant={outcome.success ? 'default' : 'secondary'}>
                              {outcome.success ? 'Successful' : 'Unsuccessful'}
                            </Badge>
                          </div>
                          <p>{outcome.description}</p>
                          {outcome.notes && <p className="text-muted-foreground">{outcome.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Complete Operation</CardTitle>
              <CardDescription>
                Final verification before completing the surgery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Closure Checklist */}
              <div className="space-y-4">
                <h4 className="font-semibold">Closure Checklist *</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={closureChecklist.sponge_count_correct}
                      onCheckedChange={(checked) => setClosureChecklist({...closureChecklist, sponge_count_correct: checked as boolean})}
                    />
                    <Label>Sponge and needle count correct</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={closureChecklist.instrument_count_correct}
                      onCheckedChange={(checked) => setClosureChecklist({...closureChecklist, instrument_count_correct: checked as boolean})}
                    />
                    <Label>Instrument count correct</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={closureChecklist.specimens_labeled}
                      onCheckedChange={(checked) => setClosureChecklist({...closureChecklist, specimens_labeled: checked as boolean})}
                    />
                    <Label>Specimens properly labeled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={closureChecklist.dressing_applied}
                      onCheckedChange={(checked) => setClosureChecklist({...closureChecklist, dressing_applied: checked as boolean})}
                    />
                    <Label>Dressing applied</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={closureChecklist.patient_stable}
                      onCheckedChange={(checked) => setClosureChecklist({...closureChecklist, patient_stable: checked as boolean})}
                    />
                    <Label>Patient vital signs stable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={closureChecklist.report_given}
                      onCheckedChange={(checked) => setClosureChecklist({...closureChecklist, report_given: checked as boolean})}
                    />
                    <Label>Report given to recovery team</Label>
                  </div>
                </div>
                <Textarea
                  placeholder="Additional closure notes..."
                  value={closureChecklist.notes}
                  onChange={(e) => setClosureChecklist({...closureChecklist, notes: e.target.value})}
                  rows={3}
                />
              </div>

              {/* Goals Achievement Summary */}
              {currentOperation && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Goals Achievement</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-green-50 rounded border">
                      <div className="font-medium text-green-800">Achieved Goals</div>
                      <div className="text-2xl font-bold text-green-600">
                        {(currentOperation.surgical_goals || []).filter(g => g.achieved).length}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded border">
                      <div className="font-medium text-blue-800">Total Goals</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {(currentOperation.surgical_goals || []).length}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowCompletionModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => completeOperation(currentOperation?.id || '')}
                  disabled={!closureChecklist.sponge_count_correct || !closureChecklist.instrument_count_correct || 
                           !closureChecklist.specimens_labeled || !closureChecklist.dressing_applied || 
                           !closureChecklist.patient_stable || !closureChecklist.report_given}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Surgery
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}