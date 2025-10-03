import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { 
  UserCheck, 
  Calendar as CalendarIcon, 
  User, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Heart,
  Phone,
  MessageSquare,
  FileText,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PostOperative() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [activeTab, setActiveTab] = useState("followup");
  const { toast } = useToast();

  const followUpPatients = [
    {
      id: "P001",
      name: "John Doe",
      procedure: "Appendectomy",
      surgeryDate: "2024-01-15",
      daysSinceSurgery: 5,
      nextAppointment: "2024-01-25",
      status: "Recovering Well",
      painLevel: 3,
      mobilityStatus: "Walking independently",
      complications: "None",
      medications: ["Ibuprofen 400mg", "Antibiotics"],
      vitalSigns: {
        temperature: "98.6°F",
        bloodPressure: "120/80",
        heartRate: "72 bpm"
      },
      incisionStatus: "Healing well, no signs of infection",
      lastContact: "2024-01-20"
    },
    {
      id: "P002",
      name: "Alice Johnson", 
      procedure: "Cholecystectomy",
      surgeryDate: "2024-01-10",
      daysSinceSurgery: 10,
      nextAppointment: "2024-01-24",
      status: "Needs Assessment",
      painLevel: 6,
      mobilityStatus: "Limited movement",
      complications: "Mild nausea",
      medications: ["Pain medication", "Anti-nausea"],
      vitalSigns: {
        temperature: "99.2°F", 
        bloodPressure: "135/85",
        heartRate: "85 bpm"
      },
      incisionStatus: "Slight redness, monitoring required",
      lastContact: "2024-01-18"
    }
  ];

  const upcomingAppointments = [
    {
      id: "A001",
      patientName: "Mike Wilson",
      procedure: "Hernia Repair",
      appointmentDate: "2024-01-22",
      appointmentTime: "10:00 AM",
      purpose: "2-week follow-up",
      status: "Confirmed"
    },
    {
      id: "A002",
      patientName: "Sarah Davis",
      procedure: "Gallbladder Surgery", 
      appointmentDate: "2024-01-23",
      appointmentTime: "02:30 PM",
      purpose: "Suture removal",
      status: "Pending Confirmation"
    }
  ];

  const handleScheduleFollowUp = (patientId: string) => {
    toast({
      title: "Follow-up scheduled",
      description: `Follow-up appointment scheduled for patient ${patientId}.`,
    });
  };

  const handleUpdateStatus = (patientId: string) => {
    toast({
      title: "Status updated",
      description: `Recovery status updated for patient ${patientId}.`,
    });
  };

  const handleContactPatient = (patientId: string, method: string) => {
    toast({
      title: `${method} initiated`,
      description: `${method} contact initiated with patient ${patientId}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Post-operative Follow-up</h1>
        <p className="text-muted-foreground">
          Patient recovery monitoring and follow-up care management
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="followup">
            Active Follow-ups ({followUpPatients.length})
          </TabsTrigger>
          <TabsTrigger value="appointments">
            Appointments ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="schedule">Schedule Follow-up</TabsTrigger>
          <TabsTrigger value="analytics">Recovery Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="followup" className="space-y-6">
          <div className="grid gap-6">
            {followUpPatients.map((patient) => (
              <Card key={patient.id} className="bg-gradient-card shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-medical rounded-full flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{patient.name}</CardTitle>
                        <CardDescription>
                          {patient.procedure} • Day {patient.daysSinceSurgery} post-op
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge 
                        variant={patient.status === 'Recovering Well' ? 'default' : 
                                patient.status === 'Needs Assessment' ? 'destructive' : 'secondary'}
                      >
                        {patient.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        Next: {patient.nextAppointment}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Recovery Status */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Recovery Status</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Pain Level (1-10)
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-2xl font-bold text-foreground">{patient.painLevel}</div>
                            <div className={`text-sm px-2 py-1 rounded ${
                              patient.painLevel <= 3 ? 'bg-success/20 text-success' :
                              patient.painLevel <= 6 ? 'bg-warning/20 text-warning' : 
                              'bg-destructive/20 text-destructive'
                            }`}>
                              {patient.painLevel <= 3 ? 'Mild' : patient.painLevel <= 6 ? 'Moderate' : 'Severe'}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Mobility Status
                          </Label>
                          <p className="text-foreground">{patient.mobilityStatus}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Complications
                          </Label>
                          <p className="text-foreground">{patient.complications}</p>
                        </div>
                      </div>
                    </div>

                    {/* Vital Signs */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Latest Vitals</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-background p-3 rounded-lg border">
                          <div className="text-xs text-muted-foreground">Temperature</div>
                          <div className="text-lg font-bold text-foreground">{patient.vitalSigns.temperature}</div>
                        </div>
                        <div className="bg-background p-3 rounded-lg border">
                          <div className="text-xs text-muted-foreground">Blood Pressure</div>
                          <div className="text-lg font-bold text-foreground">{patient.vitalSigns.bloodPressure}</div>
                        </div>
                        <div className="bg-background p-3 rounded-lg border">
                          <div className="text-xs text-muted-foreground">Heart Rate</div>
                          <div className="text-lg font-bold text-foreground">{patient.vitalSigns.heartRate}</div>
                        </div>
                      </div>
                    </div>

                    {/* Treatment Plan */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Treatment Plan</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Current Medications
                          </Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {patient.medications.map((med, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {med}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Incision Status
                          </Label>
                          <p className="text-foreground text-sm">{patient.incisionStatus}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Last Contact
                          </Label>
                          <p className="text-foreground text-sm">{patient.lastContact}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Follow-up Notes */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Follow-up Notes</h3>
                    <Textarea 
                      placeholder="Add follow-up notes and observations..."
                      className="h-20"
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      className="bg-gradient-medical text-white"
                      onClick={() => handleUpdateStatus(patient.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Update Status
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleContactPatient(patient.id, "Phone call")}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call Patient
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleContactPatient(patient.id, "Message")}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => handleScheduleFollowUp(patient.id)}
                    >
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      Schedule Visit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Upcoming Follow-up Appointments
              </CardTitle>
              <CardDescription>
                Scheduled post-operative appointments and visits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">{appointment.patientName}</div>
                    <div className="text-sm text-muted-foreground">
                      {appointment.procedure} • {appointment.purpose}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {appointment.appointmentDate} at {appointment.appointmentTime}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={appointment.status === 'Confirmed' ? 'default' : 'secondary'}
                    >
                      {appointment.status}
                    </Badge>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Schedule Follow-up Appointment
              </CardTitle>
              <CardDescription>
                Schedule post-operative follow-up for patients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Patient</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="P001">John Doe - Appendectomy</SelectItem>
                        <SelectItem value="P002">Alice Johnson - Cholecystectomy</SelectItem>
                        <SelectItem value="P003">Mike Wilson - Hernia Repair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Appointment Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select appointment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1week">1-week follow-up</SelectItem>
                        <SelectItem value="2week">2-week follow-up</SelectItem>
                        <SelectItem value="1month">1-month follow-up</SelectItem>
                        <SelectItem value="suture">Suture removal</SelectItem>
                        <SelectItem value="emergency">Emergency visit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Healthcare Provider</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dr-smith">Dr. Smith</SelectItem>
                        <SelectItem value="dr-johnson">Dr. Johnson</SelectItem>
                        <SelectItem value="nurse-williams">Nurse Williams</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Appointment Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Appointment Time</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00">09:00 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                        <SelectItem value="11:00">11:00 AM</SelectItem>
                        <SelectItem value="14:00">02:00 PM</SelectItem>
                        <SelectItem value="15:00">03:00 PM</SelectItem>
                        <SelectItem value="16:00">04:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Appointment Notes</Label>
                <Textarea 
                  placeholder="Any special instructions or notes for the appointment..."
                  className="h-20"
                />
              </div>

              <div className="flex gap-3">
                <Button className="bg-gradient-medical text-white">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Schedule Appointment
                </Button>
                <Button variant="outline">
                  Check Availability
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recovery Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">96.8%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-success">+1.2%</span> vs last month
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Avg Recovery Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">14 days</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-success">-2 days</span> improvement
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Readmission Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">2.1%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-success">-0.5%</span> reduction
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Patient Satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">9.2/10</div>
                <p className="text-xs text-muted-foreground mt-1">Follow-up care rating</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Recovery Trends</CardTitle>
              <CardDescription>
                Patient recovery patterns and outcomes analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Recovery analytics charts will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}