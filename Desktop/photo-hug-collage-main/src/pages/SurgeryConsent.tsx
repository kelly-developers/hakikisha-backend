import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SurgeryConsent() {
  const [surgeries, setSurgeries] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedSurgery, setSelectedSurgery] = useState<any>(null);
  const [consentData, setConsentData] = useState({
    patientName: "",
    nextOfKin: "",
    nextOfKinPhone: "",
    understoodRisks: false,
    understoodBenefits: false,
    understoodAlternatives: false,
    consentToSurgery: false
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const storedSurgeries = localStorage.getItem('cardiovascular-surgeries');
    const storedPatients = localStorage.getItem('patients');
    
    if (storedSurgeries) {
      const allSurgeries = JSON.parse(storedSurgeries);
      setSurgeries(allSurgeries.filter((s: any) => s.status === 'consent_pending'));
    }
    
    if (storedPatients) {
      setPatients(JSON.parse(storedPatients));
    }
  };

  const getPatientById = (patientId: string) => {
    return patients.find(p => p.id === patientId);
  };

  const handleSurgerySelect = (surgery: any) => {
    setSelectedSurgery(surgery);
    const patient = getPatientById(surgery.patient_id);
    setConsentData({
      patientName: `${patient?.first_name || ''} ${patient?.last_name || ''}`,
      nextOfKin: patient?.emergency_contact_name || '',
      nextOfKinPhone: patient?.emergency_contact_phone || '',
      understoodRisks: false,
      understoodBenefits: false,
      understoodAlternatives: false,
      consentToSurgery: false
    });
  };

  const handleConsentDecision = (accepted: boolean) => {
    if (!selectedSurgery) return;

    if (accepted) {
      // Validate all checkboxes are checked
      if (!consentData.understoodRisks || !consentData.understoodBenefits || 
          !consentData.understoodAlternatives || !consentData.consentToSurgery) {
        toast({
          title: "Error",
          description: "Please acknowledge all consent requirements",
          variant: "destructive",
        });
        return;
      }

      if (!consentData.nextOfKin || !consentData.nextOfKinPhone) {
        toast({
          title: "Error",
          description: "Please provide next of kin information",
          variant: "destructive",
        });
        return;
      }
    }

    const storedSurgeries = JSON.parse(localStorage.getItem('cardiovascular-surgeries') || '[]');
    const updatedSurgeries = storedSurgeries.map((s: any) => {
      if (s.id === selectedSurgery.id) {
        return {
          ...s,
          status: accepted ? 'scheduled' : 'consent_declined',
          consent_date: new Date().toISOString(),
          consent_data: accepted ? consentData : null
        };
      }
      return s;
    });

    localStorage.setItem('cardiovascular-surgeries', JSON.stringify(updatedSurgeries));
    
    toast({
      title: accepted ? "Consent Accepted" : "Consent Declined",
      description: accepted 
        ? "Surgery has been approved and moved to scheduling" 
        : "Surgery consent has been declined",
      variant: accepted ? "default" : "destructive"
    });

    loadData();
    setSelectedSurgery(null);
  };

  const handlePrintConsent = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Surgery Consent Management</h1>
        <p className="text-muted-foreground">
          Obtain and manage patient consent for surgical procedures
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Consent List */}
        <Card className="lg:col-span-1 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Pending Consent
            </CardTitle>
            <CardDescription>
              Surgeries requiring patient consent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {surgeries.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No pending consents
                </div>
              ) : (
                surgeries.map((surgery) => {
                  const patient = getPatientById(surgery.patient_id);
                  return (
                    <div 
                      key={surgery.id} 
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSurgery?.id === surgery.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'bg-background hover:bg-muted/50'
                      }`}
                      onClick={() => handleSurgerySelect(surgery)}
                    >
                      <div className="font-medium text-sm">
                        {patient?.first_name} {patient?.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {surgery.procedure_name}
                      </div>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {surgery.urgency}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Consent Form */}
        <Card className="lg:col-span-2 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Surgical Consent Form
            </CardTitle>
            <CardDescription>
              Patient consent for surgical procedure
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedSurgery ? (
              <div className="text-center text-muted-foreground py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a patient from the list to begin consent process</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Patient Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">Patient Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Patient Name</Label>
                      <Input value={consentData.patientName} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Procedure</Label>
                      <Input value={selectedSurgery.procedure_name} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nextOfKin">Next of Kin *</Label>
                      <Input 
                        id="nextOfKin"
                        value={consentData.nextOfKin}
                        onChange={(e) => setConsentData({...consentData, nextOfKin: e.target.value})}
                        placeholder="Enter next of kin name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nextOfKinPhone">Next of Kin Phone *</Label>
                      <Input 
                        id="nextOfKinPhone"
                        value={consentData.nextOfKinPhone}
                        onChange={(e) => setConsentData({...consentData, nextOfKinPhone: e.target.value})}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Procedure Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Procedure Details</h3>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                    <div><strong>Diagnosis:</strong> {selectedSurgery.diagnosis}</div>
                    <div><strong>Recommended Surgery:</strong> {selectedSurgery.procedure_name}</div>
                    <div><strong>Urgency Level:</strong> <Badge variant="outline">{selectedSurgery.urgency}</Badge></div>
                    <div><strong>Recommended By:</strong> {selectedSurgery.recommended_by}</div>
                  </div>
                </div>

                <Separator />

                {/* Consent Acknowledgments */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Consent Acknowledgments</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="understoodRisks"
                        checked={consentData.understoodRisks}
                        onCheckedChange={(checked) => setConsentData({...consentData, understoodRisks: checked as boolean})}
                      />
                      <Label htmlFor="understoodRisks" className="text-sm cursor-pointer leading-relaxed">
                        I understand the risks associated with this surgical procedure including, but not limited to: infection, bleeding, adverse reactions to anesthesia, and potential complications specific to cardiovascular surgery.
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="understoodBenefits"
                        checked={consentData.understoodBenefits}
                        onCheckedChange={(checked) => setConsentData({...consentData, understoodBenefits: checked as boolean})}
                      />
                      <Label htmlFor="understoodBenefits" className="text-sm cursor-pointer leading-relaxed">
                        I understand the potential benefits of this surgery and how it may improve my cardiovascular health and quality of life.
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="understoodAlternatives"
                        checked={consentData.understoodAlternatives}
                        onCheckedChange={(checked) => setConsentData({...consentData, understoodAlternatives: checked as boolean})}
                      />
                      <Label htmlFor="understoodAlternatives" className="text-sm cursor-pointer leading-relaxed">
                        I have been informed of alternative treatment options and have had the opportunity to discuss them with my healthcare provider.
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2 pt-2 border-t">
                      <Checkbox 
                        id="consentToSurgery"
                        checked={consentData.consentToSurgery}
                        onCheckedChange={(checked) => setConsentData({...consentData, consentToSurgery: checked as boolean})}
                      />
                      <Label htmlFor="consentToSurgery" className="text-sm font-medium cursor-pointer leading-relaxed">
                        I hereby give my informed consent to proceed with the surgical procedure described above.
                      </Label>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button 
                    className="bg-gradient-medical text-white"
                    onClick={() => handleConsentDecision(true)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept & Sign Consent
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleConsentDecision(false)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline Consent
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handlePrintConsent}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Print Form
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> This consent form must be printed, signed by the patient or legal guardian, and filed in the patient's medical record before the surgery can be scheduled.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
