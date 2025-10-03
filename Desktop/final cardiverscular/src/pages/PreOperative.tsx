import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardCheck, 
  User, 
  CheckCircle, 
  AlertTriangle,
  Save,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PreOperative() {
  const [patients, setPatients] = useState<any[]>([]);
  const [surgeries, setSurgeries] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [procedureName, setProcedureName] = useState("");
  const { toast } = useToast();

  // WHO Pre-operative Checklist Items (REDCap-style structured data)
  const [checklist, setChecklist] = useState({
    // Patient Identity Confirmation
    patientIdentityConfirmed: false,
    consentSigned: false,
    sitemarked: false,
    
    // Anesthesia Safety Check
    anesthesiaMachineChecked: false,
    oxygenAvailable: false,
    suction: false,
    
    // Patient Assessment
    knownAllergy: "",
    difficultAirway: "",
    aspirationRisk: "",
    bloodLossRisk: "",
    
    // Equipment and Implants
    sterileIndicatorsConfirmed: false,
    equipmentIssues: "",
    implantAvailable: "",
    
    // Additional Information
    antibioticProphylaxis: "",
    imagingDisplayed: "",
    criticalSteps: "",
    anticipatedDuration: "",
    
    // Team Member Confirmation
    nurseConfirmed: false,
    anesthetistConfirmed: false,
    surgeonConfirmed: false,
    
    // Additional Notes
    additionalConcerns: "",
    
    // Metadata
    completedBy: "",
    completedAt: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      // Load patients
      const storedPatients = localStorage.getItem('cvms_patients') || localStorage.getItem('cardiovascular-patients') || localStorage.getItem('patients');
      if (storedPatients) {
        const parsedPatients = JSON.parse(storedPatients);
        setPatients(Array.isArray(parsedPatients) ? parsedPatients : []);
      }

      // Load surgeries to find patients with approved consent
      const storedSurgeries = localStorage.getItem('cardiovascular-surgeries');
      if (storedSurgeries) {
        const parsedSurgeries = JSON.parse(storedSurgeries);
        setSurgeries(Array.isArray(parsedSurgeries) ? parsedSurgeries : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setPatients([]);
      setSurgeries([]);
    }
  };

  // Get patients who have approved consent for surgery
  const getPatientsWithApprovedConsent = () => {
    const approvedSurgeries = surgeries.filter(surgery => 
      surgery.status === 'scheduled' || surgery.status === 'consent_approved'
    );
    
    const approvedPatientIds = new Set(approvedSurgeries.map(surgery => surgery.patient_id));
    
    return patients.filter(patient => approvedPatientIds.has(patient.id));
  };

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatient(patientId);
    
    // Auto-fill procedure name from approved surgery
    const patientSurgery = surgeries.find(surgery => 
      surgery.patient_id === patientId && (surgery.status === 'scheduled' || surgery.status === 'consent_approved')
    );
    
    if (patientSurgery) {
      setProcedureName(patientSurgery.procedure_name || '');
    }
  };

  const handleCheckboxChange = (field: string, checked: boolean) => {
    setChecklist(prev => ({ ...prev, [field]: checked }));
  };

  const handleInputChange = (field: string, value: string) => {
    setChecklist(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChecklist = () => {
    if (!selectedPatient) {
      toast({
        title: "Patient required",
        description: "Please select a patient before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!procedureName) {
      toast({
        title: "Procedure required",
        description: "Please enter a procedure name.",
        variant: "destructive",
      });
      return;
    }

    const currentUser = "Current User"; // You can replace this with your auth context

    const checklistData = {
      id: `preop_${Date.now()}`,
      patient_id: selectedPatient,
      patient_name: patients.find(p => p.id === selectedPatient)?.first_name + ' ' + patients.find(p => p.id === selectedPatient)?.last_name,
      procedure_name: procedureName,
      ...checklist,
      completedBy: currentUser,
      completedAt: new Date().toISOString(),
      status: 'completed',
    };

    // Save to localStorage
    try {
      const existingChecklists = JSON.parse(localStorage.getItem('cvms_preop_checklists') || '[]');
      const updatedChecklists = [...existingChecklists, checklistData];
      localStorage.setItem('cvms_preop_checklists', JSON.stringify(updatedChecklists));

      // Update surgery status to indicate pre-op checklist is completed
      const storedSurgeries = JSON.parse(localStorage.getItem('cardiovascular-surgeries') || '[]');
      const updatedSurgeries = storedSurgeries.map((surgery: any) => {
        if (surgery.patient_id === selectedPatient && (surgery.status === 'scheduled' || surgery.status === 'consent_approved')) {
          return {
            ...surgery,
            preop_checklist_completed: true,
            preop_checklist_date: new Date().toISOString()
          };
        }
        return surgery;
      });
      localStorage.setItem('cardiovascular-surgeries', JSON.stringify(updatedSurgeries));

      toast({
        title: "Pre-operative checklist saved",
        description: `Checklist for ${patients.find(p => p.id === selectedPatient)?.first_name} has been saved successfully.`,
      });

      // Reset form
      setSelectedPatient("");
      setProcedureName("");
      setChecklist({
        patientIdentityConfirmed: false,
        consentSigned: false,
        sitemarked: false,
        anesthesiaMachineChecked: false,
        oxygenAvailable: false,
        suction: false,
        knownAllergy: "",
        difficultAirway: "",
        aspirationRisk: "",
        bloodLossRisk: "",
        sterileIndicatorsConfirmed: false,
        equipmentIssues: "",
        implantAvailable: "",
        antibioticProphylaxis: "",
        imagingDisplayed: "",
        criticalSteps: "",
        anticipatedDuration: "",
        nurseConfirmed: false,
        anesthetistConfirmed: false,
        surgeonConfirmed: false,
        additionalConcerns: "",
        completedBy: "",
        completedAt: "",
      });

    } catch (error) {
      console.error('Error saving checklist:', error);
      toast({
        title: "Error",
        description: "Failed to save checklist. Please try again.",
        variant: "destructive",
      });
    }
  };

  const allCriticalChecksCompleted = 
    checklist.patientIdentityConfirmed &&
    checklist.consentSigned &&
    checklist.sitemarked &&
    checklist.anesthesiaMachineChecked &&
    checklist.sterileIndicatorsConfirmed &&
    checklist.nurseConfirmed &&
    checklist.anesthetistConfirmed &&
    checklist.surgeonConfirmed;

  const patientsWithApprovedConsent = getPatientsWithApprovedConsent();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Pre-Operative Checklist</h1>
        <p className="text-muted-foreground">
          WHO Surgical Safety Checklist - Before Induction of Anesthesia (Sign In)
        </p>
      </div>

      {/* Patient Selection */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Patient & Procedure Information
          </CardTitle>
          <CardDescription>
            Select patient with approved consent and enter procedure details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Patient *</Label>
              <Select value={selectedPatient} onValueChange={handlePatientSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient with approved consent" />
                </SelectTrigger>
                <SelectContent>
                  {patientsWithApprovedConsent.length === 0 ? (
                    <SelectItem value="no-patients" disabled>
                      No patients with approved consent found
                    </SelectItem>
                  ) : (
                    patientsWithApprovedConsent.map((patient) => {
                      const patientSurgery = surgeries.find(surgery => 
                        surgery.patient_id === patient.id && (surgery.status === 'scheduled' || surgery.status === 'consent_approved')
                      );
                      return (
                        <SelectItem key={patient.id} value={patient.id}>
                          <div className="flex flex-col">
                            <span>{patient.first_name} {patient.last_name} - {patient.patient_id}</span>
                            {patientSurgery && (
                              <span className="text-xs text-muted-foreground">
                                Procedure: {patientSurgery.procedure_name}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {patientsWithApprovedConsent.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  No patients with approved consent found. Patients must approve consent in the Consent Management section first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="procedure">Procedure Name *</Label>
              <Input
                id="procedure"
                placeholder="e.g., Coronary Artery Bypass Graft"
                value={procedureName}
                onChange={(e) => setProcedureName(e.target.value)}
              />
            </div>
          </div>

          {selectedPatient && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Patient has approved consent for surgery</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WHO Checklist - Sign In Phase */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Sign In - Before Induction of Anesthesia
          </CardTitle>
          <CardDescription>
            Complete all checks before proceeding with anesthesia
          </CardDescription>
          {allCriticalChecksCompleted && (
            <Badge className="bg-green-500 text-white w-fit">
              <CheckCircle className="w-4 h-4 mr-2" />
              All Critical Checks Complete
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Section 1: Patient Identity */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-bold">1</span>
              </div>
              Patient Identity Confirmation
            </h3>
            <div className="space-y-3 pl-10">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="identity"
                  checked={checklist.patientIdentityConfirmed}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange('patientIdentityConfirmed', checked as boolean)
                  }
                />
                <Label htmlFor="identity" className="text-sm font-normal cursor-pointer">
                  Patient has confirmed identity, site, procedure, and consent *
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="consent"
                  checked={checklist.consentSigned}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange('consentSigned', checked as boolean)
                  }
                />
                <Label htmlFor="consent" className="text-sm font-normal cursor-pointer">
                  Consent form signed and documented *
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="sitemarked"
                  checked={checklist.sitemarked}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange('sitemarked', checked as boolean)
                  }
                />
                <Label htmlFor="sitemarked" className="text-sm font-normal cursor-pointer">
                  Site marked / Not applicable *
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2: Anesthesia Safety */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-bold">2</span>
              </div>
              Anesthesia Safety Check
            </h3>
            <div className="space-y-3 pl-10">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="anesthesia-machine"
                  checked={checklist.anesthesiaMachineChecked}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange('anesthesiaMachineChecked', checked as boolean)
                  }
                />
                <Label htmlFor="anesthesia-machine" className="text-sm font-normal cursor-pointer">
                  Anesthesia machine and medication check complete *
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="oxygen"
                  checked={checklist.oxygenAvailable}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange('oxygenAvailable', checked as boolean)
                  }
                />
                <Label htmlFor="oxygen" className="text-sm font-normal cursor-pointer">
                  Pulse oximeter on patient and functioning
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="suction"
                  checked={checklist.suction}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange('suction', checked as boolean)
                  }
                />
                <Label htmlFor="suction" className="text-sm font-normal cursor-pointer">
                  Suction available and functioning
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 3: Patient Risk Assessment */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-bold">3</span>
              </div>
              Patient-Specific Risk Assessment
            </h3>
            <div className="space-y-4 pl-10">
              <div className="space-y-2">
                <Label htmlFor="allergy">Known Allergy?</Label>
                <Select 
                  value={checklist.knownAllergy} 
                  onValueChange={(value) => handleInputChange('knownAllergy', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes - Documented</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="airway">Difficult Airway / Aspiration Risk?</Label>
                <Select 
                  value={checklist.difficultAirway} 
                  onValueChange={(value) => handleInputChange('difficultAirway', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes - Equipment available</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodloss">Risk of Blood Loss {'>'} 500ml (7ml/kg in children)?</Label>
                <Select 
                  value={checklist.bloodLossRisk} 
                  onValueChange={(value) => handleInputChange('bloodLossRisk', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes - IV access and fluids available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 4: Equipment & Sterility */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-bold">4</span>
              </div>
              Equipment and Sterility Confirmation
            </h3>
            <div className="space-y-4 pl-10">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="sterile"
                  checked={checklist.sterileIndicatorsConfirmed}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange('sterileIndicatorsConfirmed', checked as boolean)
                  }
                />
                <Label htmlFor="sterile" className="text-sm font-normal cursor-pointer">
                  Sterility indicators confirmed (including chemical indicator results) *
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment">Any Equipment Issues?</Label>
                <Textarea
                  id="equipment"
                  placeholder="Describe any equipment concerns or issues..."
                  value={checklist.equipmentIssues}
                  onChange={(e) => handleInputChange('equipmentIssues', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="implant">Implants / Special Equipment Available?</Label>
                <Select 
                  value={checklist.implantAvailable} 
                  onValueChange={(value) => handleInputChange('implantAvailable', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                    <SelectItem value="yes">Yes - Available and verified</SelectItem>
                    <SelectItem value="issue">Issue - See notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 5: Additional Pre-op Requirements */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-bold">5</span>
              </div>
              Additional Pre-operative Requirements
            </h3>
            <div className="space-y-4 pl-10">
              <div className="space-y-2">
                <Label htmlFor="antibiotic">Antibiotic Prophylaxis Given (Within 60 min)?</Label>
                <Select 
                  value={checklist.antibioticProphylaxis} 
                  onValueChange={(value) => handleInputChange('antibioticProphylaxis', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imaging">Essential Imaging Displayed?</Label>
                <Select 
                  value={checklist.imagingDisplayed} 
                  onValueChange={(value) => handleInputChange('imagingDisplayed', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 6: Team Confirmation */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-bold">6</span>
              </div>
              Surgical Team Member Confirmation
            </h3>
            <div className="space-y-3 pl-10">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="nurse"
                  checked={checklist.nurseConfirmed}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange('nurseConfirmed', checked as boolean)
                  }
                />
                <Label htmlFor="nurse" className="text-sm font-normal cursor-pointer">
                  Nurse verbally confirms completion of checks *
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="anesthetist"
                  checked={checklist.anesthetistConfirmed}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange('anesthetistConfirmed', checked as boolean)
                  }
                />
                <Label htmlFor="anesthetist" className="text-sm font-normal cursor-pointer">
                  Anesthetist verbally confirms completion of checks *
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="surgeon"
                  checked={checklist.surgeonConfirmed}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange('surgeonConfirmed', checked as boolean)
                  }
                />
                <Label htmlFor="surgeon" className="text-sm font-normal cursor-pointer">
                  Surgeon verbally confirms completion of checks *
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Concerns */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Additional Concerns or Notes</h3>
            <Textarea
              placeholder="Document any additional concerns, special considerations, or notes..."
              value={checklist.additionalConcerns}
              onChange={(e) => handleInputChange('additionalConcerns', e.target.value)}
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSaveChecklist}
              disabled={!allCriticalChecksCompleted || !selectedPatient || !procedureName}
            >
              <Save className="w-4 h-4 mr-2" />
              Save & Proceed to Surgery
            </Button>
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview Checklist
            </Button>
          </div>

          {!allCriticalChecksCompleted && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Complete all critical checks</p>
                <p className="text-muted-foreground">
                  All items marked with * must be completed before proceeding to surgery.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}