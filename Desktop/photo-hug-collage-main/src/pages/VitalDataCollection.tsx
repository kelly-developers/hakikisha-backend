import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Heart, Activity, Thermometer, Weight, Ruler, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VitalData {
  id: string;
  patientId: string;
  patientName: string;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  heartRate: number;
  temperature: number;
  weight: number;
  height: number;
  oxygenSaturation: number;
  ecgReading?: string;
  symptoms: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  recordedBy: string;
}

export default function VitalDataCollection() {
  const [vitals, setVitals] = useState<VitalData[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [formData, setFormData] = useState({
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    temperature: "",
    weight: "",
    height: "",
    oxygenSaturation: "",
    ecgReading: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    loadVitals();
    loadPatients();
  }, []);

  const loadVitals = () => {
    const stored = localStorage.getItem('cardiovascular-vitals');
    if (stored) {
      setVitals(JSON.parse(stored));
    }
  };

  const loadPatients = () => {
    const stored = localStorage.getItem('patients');
    if (stored) {
      setPatients(JSON.parse(stored));
    }
  };

  const calculateRiskLevel = (vitals: any): 'low' | 'medium' | 'high' | 'critical' => {
    const systolic = parseInt(vitals.bloodPressureSystolic);
    const diastolic = parseInt(vitals.bloodPressureDiastolic);
    const heartRate = parseInt(vitals.heartRate);
    const oxygenSat = parseInt(vitals.oxygenSaturation);

    // Critical conditions
    if (systolic > 180 || diastolic > 120 || heartRate > 120 || heartRate < 50 || oxygenSat < 90) {
      return 'critical';
    }
    // High risk
    if (systolic > 160 || diastolic > 100 || heartRate > 100 || oxygenSat < 95) {
      return 'high';
    }
    // Medium risk
    if (systolic > 140 || diastolic > 90 || heartRate > 80) {
      return 'medium';
    }
    return 'low';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      toast({
        title: "Error",
        description: "Please select a patient",
        variant: "destructive",
      });
      return;
    }

    const selectedPatientData = patients.find(p => p.id === selectedPatient);
    const riskLevel = calculateRiskLevel(formData);
    
    const newVital: VitalData = {
      id: Date.now().toString(),
      patientId: selectedPatient,
      patientName: `${selectedPatientData?.first_name} ${selectedPatientData?.last_name}`,
      bloodPressureSystolic: parseInt(formData.bloodPressureSystolic),
      bloodPressureDiastolic: parseInt(formData.bloodPressureDiastolic),
      heartRate: parseInt(formData.heartRate),
      temperature: parseFloat(formData.temperature),
      weight: parseFloat(formData.weight),
      height: parseFloat(formData.height),
      oxygenSaturation: parseInt(formData.oxygenSaturation),
      ecgReading: formData.ecgReading,
      symptoms: "",
      riskLevel,
      timestamp: new Date().toISOString(),
      recordedBy: "Current User"
    };

    const updatedVitals = [newVital, ...vitals];
    setVitals(updatedVitals);
    localStorage.setItem('cardiovascular-vitals', JSON.stringify(updatedVitals));

    // Reset form
    setFormData({
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      heartRate: "",
      temperature: "",
      weight: "",
      height: "",
      oxygenSaturation: "",
      ecgReading: ""
    });
    setSelectedPatient("");

    toast({
      title: "Success",
      description: `Vital data recorded successfully. Risk level: ${riskLevel.toUpperCase()}`,
    });
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Vital Data Collection</h1>
        <p className="text-muted-foreground">
          Record and monitor cardiovascular vital signs and symptoms
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vital Data Entry Form */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Record Vital Signs
            </CardTitle>
            <CardDescription>
              Enter patient cardiovascular vital data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient">Select Patient</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="systolic">Blood Pressure (Systolic)</Label>
                  <Input
                    id="systolic"
                    type="number"
                    placeholder="120"
                    value={formData.bloodPressureSystolic}
                    onChange={(e) => setFormData({...formData, bloodPressureSystolic: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diastolic">Blood Pressure (Diastolic)</Label>
                  <Input
                    id="diastolic"
                    type="number"
                    placeholder="80"
                    value={formData.bloodPressureDiastolic}
                    onChange={(e) => setFormData({...formData, bloodPressureDiastolic: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="heartRate">Heart Rate (BPM)</Label>
                  <Input
                    id="heartRate"
                    type="number"
                    placeholder="72"
                    value={formData.heartRate}
                    onChange={(e) => setFormData({...formData, heartRate: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    placeholder="36.5"
                    value={formData.temperature}
                    onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={formData.weight}
                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="170"
                    value={formData.height}
                    onChange={(e) => setFormData({...formData, height: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oxygenSat">O2 Saturation (%)</Label>
                  <Input
                    id="oxygenSat"
                    type="number"
                    placeholder="98"
                    value={formData.oxygenSaturation}
                    onChange={(e) => setFormData({...formData, oxygenSaturation: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ecg">ECG Reading (Optional)</Label>
                <Input
                  id="ecg"
                  placeholder="Normal sinus rhythm"
                  value={formData.ecgReading}
                  onChange={(e) => setFormData({...formData, ecgReading: e.target.value})}
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-medical text-white">
                Record Vital Data
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Vital Records */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Vital Records
            </CardTitle>
            <CardDescription>
              Latest cardiovascular measurements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {vitals.map((vital) => (
                <div key={vital.id} className="p-4 bg-background rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{vital.patientName}</div>
                    <Badge className={getRiskBadgeColor(vital.riskLevel)}>
                      {vital.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>BP: {vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic}</div>
                    <div>HR: {vital.heartRate} BPM</div>
                    <div>Temp: {vital.temperature}°C</div>
                    <div>O2: {vital.oxygenSaturation}%</div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(vital.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
              {vitals.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No vital data recorded yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}