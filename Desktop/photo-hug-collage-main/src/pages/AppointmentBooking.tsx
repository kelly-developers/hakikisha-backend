import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Stethoscope, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  type: 'consultation' | 'follow-up' | 'emergency' | 'surgery';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  reason: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  arrivalStatus?: 'pending' | 'arrived' | 'late' | 'no-show';
}

const doctors = [
  { id: "1", name: "Dr. Sarah Johnson", specialty: "Cardiologist", available: true },
  { id: "2", name: "Dr. Michael Chen", specialty: "Cardiac Surgeon", available: true },
  { id: "3", name: "Dr. Emily Davis", specialty: "Interventional Cardiologist", available: true },
  { id: "4", name: "Dr. James Wilson", specialty: "Cardiothoracic Surgeon", available: false },
];

export default function AppointmentBooking() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    date: "",
    time: "",
    type: "",
    priority: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAppointments();
    loadPatients();
  }, []);

  const loadAppointments = () => {
    const stored = localStorage.getItem('cardiovascular-appointments');
    if (stored) {
      setAppointments(JSON.parse(stored));
    }
  };

  const loadPatients = () => {
    const stored = localStorage.getItem('patients');
    if (stored) {
      setPatients(JSON.parse(stored));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedPatient = patients.find(p => p.id === formData.patientId);
    const selectedDoctor = formData.doctorId ? doctors.find(d => d.id === formData.doctorId) : null;
    
    if (!selectedPatient) {
      toast({
        title: "Error",
        description: "Please select a patient",
        variant: "destructive",
      });
      return;
    }

    const newAppointment: Appointment = {
      id: Date.now().toString(),
      patientId: formData.patientId,
      patientName: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
      doctorId: formData.doctorId || 'unassigned',
      doctorName: selectedDoctor?.name || 'Unassigned',
      date: formData.date,
      time: formData.time,
      type: formData.type as any,
      status: 'scheduled',
      reason: '',
      notes: '',
      priority: formData.priority as any,
      createdAt: new Date().toISOString(),
      arrivalStatus: 'pending'
    };

    const updatedAppointments = [newAppointment, ...appointments];
    setAppointments(updatedAppointments);
    localStorage.setItem('cardiovascular-appointments', JSON.stringify(updatedAppointments));

    // Create notification for doctor
    const notifications = JSON.parse(localStorage.getItem('cardiovascular-notifications') || '[]');
    const notification = {
      id: Date.now().toString() + '_notif',
      type: 'appointment',
      title: 'New Appointment Scheduled',
      message: `${newAppointment.patientName} has been scheduled for ${formData.type} on ${formData.date} at ${formData.time}`,
      doctorId: formData.doctorId,
      appointmentId: newAppointment.id,
      priority: formData.priority,
      read: false,
      createdAt: new Date().toISOString()
    };
    notifications.unshift(notification);
    localStorage.setItem('cardiovascular-notifications', JSON.stringify(notifications));

    // Reset form
    setFormData({
      patientId: "",
      doctorId: "",
      date: "",
      time: "",
      type: "",
      priority: ""
    });

    toast({
      title: "Success",
      description: "Appointment scheduled successfully. Doctor has been notified.",
    });
  };

  const updateAppointmentStatus = (appointmentId: string, newStatus: string) => {
    const updatedAppointments = appointments.map(app => 
      app.id === appointmentId ? { ...app, status: newStatus as any } : app
    );
    setAppointments(updatedAppointments);
    localStorage.setItem('cardiovascular-appointments', JSON.stringify(updatedAppointments));

    toast({
      title: "Status Updated",
      description: `Appointment status changed to ${newStatus}`,
    });
  };

  const updateArrivalStatus = (appointmentId: string, arrivalStatus: 'arrived' | 'late' | 'no-show') => {
    const updatedAppointments = appointments.map(app => {
      if (app.id === appointmentId) {
        // If late, move to end of schedule for that day
        if (arrivalStatus === 'late') {
          return { ...app, arrivalStatus, priority: 'low' as any };
        }
        return { ...app, arrivalStatus };
      }
      return app;
    });
    
    setAppointments(updatedAppointments);
    localStorage.setItem('cardiovascular-appointments', JSON.stringify(updatedAppointments));

    toast({
      title: arrivalStatus === 'arrived' ? "Patient Arrived" : arrivalStatus === 'late' ? "Marked as Late" : "Marked as No-Show",
      description: arrivalStatus === 'late' ? "Patient moved to end of schedule" : undefined,
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500 text-white';
      case 'confirmed': return 'bg-green-500 text-white';
      case 'completed': return 'bg-gray-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Appointment Booking</h1>
        <p className="text-muted-foreground">
          Schedule cardiac consultations and medical appointments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Booking Form */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Book New Appointment
            </CardTitle>
            <CardDescription>
              Schedule patient consultation with cardiologist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient">Select Patient</Label>
                <Select value={formData.patientId} onValueChange={(value) => setFormData({...formData, patientId: value})}>
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
                <Label htmlFor="doctor">Select Doctor (Optional)</Label>
                <Select value={formData.doctorId} onValueChange={(value) => setFormData({...formData, doctorId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose doctor (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.filter(d => d.available).map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Appointment Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="surgery">Surgery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-medical text-white">
                Schedule Appointment
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Appointment List */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Scheduled Appointments
            </CardTitle>
            <CardDescription>
              Manage and track patient appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="p-4 bg-background rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{appointment.patientName}</div>
                    <div className="flex gap-2">
                      <Badge className={getPriorityBadgeColor(appointment.priority)}>
                        {appointment.priority.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusBadgeColor(appointment.status)}>
                        {appointment.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div><strong>Doctor:</strong> {appointment.doctorName}</div>
                    <div><strong>Date & Time:</strong> {appointment.date} at {appointment.time}</div>
                    <div><strong>Type:</strong> {appointment.type}</div>
                    {appointment.arrivalStatus && appointment.arrivalStatus !== 'pending' && (
                      <div>
                        <strong>Arrival Status:</strong> 
                        <Badge className="ml-2" variant={
                          appointment.arrivalStatus === 'arrived' ? 'default' : 
                          appointment.arrivalStatus === 'late' ? 'secondary' : 'destructive'
                        }>
                          {appointment.arrivalStatus}
                        </Badge>
                      </div>
                    )}
                  </div>
                  {appointment.status === 'scheduled' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateArrivalStatus(appointment.id, 'arrived')}
                        variant="default"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Arrived
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateArrivalStatus(appointment.id, 'late')}
                        variant="secondary"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Late
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateArrivalStatus(appointment.id, 'no-show')}
                      >
                        <AlertCircle className="w-3 h-3 mr-1" />
                        No-Show
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {appointments.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No appointments scheduled yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}