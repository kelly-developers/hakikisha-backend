import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  User, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Play,
  Pause,
  Square,
  Eye,
  FileText,
  Heart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
export default function SurgeryTracking() {
  const [activeTab, setActiveTab] = useState("live");
  const [surgeries, setSurgeries] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadSurgeries();
    loadPatients();
  }, []);

  const loadSurgeries = () => {
    const stored = localStorage.getItem('cardiovascular-surgeries');
    if (stored) {
      setSurgeries(JSON.parse(stored));
    }
  };

  const loadPatients = () => {
    const stored = localStorage.getItem('cardiovascular-patients');
    if (stored) {
      setPatients(JSON.parse(stored));
    }
  };

  const getPatientById = (patientId: string) => {
    return patients.find(p => p.id === patientId);
  };

  const liveSurgeries = surgeries.filter(s => s.status === 'in_progress');
  const upcomingSurgeries = surgeries.filter(s => s.status === 'scheduled');
  const completedSurgeries = surgeries.filter(s => s.status === 'completed');

  const handleStartSurgery = async (surgeryId: string) => {
    try {
      const updatedSurgeries = surgeries.map(s => 
        s.id === surgeryId 
          ? { ...s, status: 'in_progress', actual_date: new Date().toISOString() }
          : s
      );
      setSurgeries(updatedSurgeries);
      localStorage.setItem('cardiovascular-surgeries', JSON.stringify(updatedSurgeries));
      
      toast({
        title: "Surgery started",
        description: `Surgery has been marked as started.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start surgery",
        variant: "destructive",
      });
    }
  };

  const handleCompleteSurgery = async (surgeryId: string) => {
    try {
      const updatedSurgeries = surgeries.map(s => 
        s.id === surgeryId 
          ? { ...s, status: 'completed', completed_date: new Date().toISOString() }
          : s
      );
      setSurgeries(updatedSurgeries);
      localStorage.setItem('cardiovascular-surgeries', JSON.stringify(updatedSurgeries));
      
      toast({
        title: "Surgery completed",
        description: `Surgery has been completed successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to complete surgery",
        variant: "destructive",
      });
    }
  };

  const handleEmergencyAlert = (surgeryId: string) => {
    toast({
      title: "Emergency alert sent",
      description: `Emergency assistance requested for surgery ${surgeryId}.`,
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Surgery Tracking</h1>
        <p className="text-muted-foreground">
          Real-time surgical procedure monitoring and management
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="live">
            Live Surgeries ({liveSurgeries.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingSurgeries.length})
          </TabsTrigger>
          <TabsTrigger value="completed">Completed Today</TabsTrigger>
          <TabsTrigger value="analytics">Surgery Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6">
          <div className="grid gap-6">
            {liveSurgeries.length === 0 ? (
              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-8 text-center">
                  <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No live surgeries in progress</p>
                </CardContent>
              </Card>
            ) : (
              liveSurgeries.map((surgery) => (
              <Card key={surgery.id} className="bg-gradient-card shadow-card border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-medical rounded-full flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white animate-pulse" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{surgery.procedure_name}</CardTitle>
                        <CardDescription>
                          {surgery.patients?.first_name} {surgery.patients?.last_name} • Started: {surgery.actual_date ? new Date(surgery.actual_date).toLocaleTimeString() : 'N/A'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge className="bg-success text-success-foreground">
                        LIVE
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Surgery Progress */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Surgery Progress</h3>
                      <span className="text-sm font-medium">In Progress</span>
                    </div>
                    <Progress value={50} className="h-3" />
                    <div className="text-sm text-muted-foreground">
                      Current Phase: <span className="font-medium text-foreground">In Progress</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Team Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Surgical Team</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Lead Surgeon
                          </Label>
                          <p className="text-foreground">{surgery.surgeon_name || 'TBD'}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Assistant Surgeon
                          </Label>
                          <p className="text-foreground">{surgery.assistant_surgeon || 'None assigned'}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Anesthesia Type
                          </Label>
                          <p className="text-foreground">{surgery.anesthesia_type || 'TBD'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Patient Information</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Duration
                          </Label>
                          <p className="text-foreground">{surgery.duration_minutes ? `${surgery.duration_minutes} min` : 'Ongoing'}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Status
                          </Label>
                          <p className="text-foreground capitalize">{surgery.status.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Surgery Notes */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Live Surgery Notes</h3>
                    <Textarea 
                      placeholder="Add real-time surgical notes..."
                      className="h-20"
                    />
                    <Button size="sm" variant="outline">
                      Add Note
                    </Button>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      className="bg-gradient-success text-white"
                      onClick={() => handleCompleteSurgery(surgery.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Surgery
                    </Button>
                    <Button variant="outline">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => handleEmergencyAlert(surgery.id)}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Emergency Alert
                    </Button>
                    <Button variant="ghost">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Upcoming Surgeries
              </CardTitle>
              <CardDescription>
                Scheduled surgical procedures for today
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingSurgeries.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No upcoming surgeries scheduled
                </div>
              ) : (
                upcomingSurgeries.map((surgery) => (
                  <div key={surgery.id} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{surgery.procedure_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Patient: {surgery.patients?.first_name} {surgery.patients?.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {surgery.scheduled_date ? new Date(surgery.scheduled_date).toLocaleString() : 'Time TBD'} • {surgery.surgeon_name || 'Surgeon TBD'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{surgery.status}</Badge>
                      <Button 
                        size="sm"
                        onClick={() => handleStartSurgery(surgery.id)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Surgery
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Completed Surgeries
              </CardTitle>
              <CardDescription>
                Successfully completed procedures today
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {completedSurgeries.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No completed surgeries today
                </div>
              ) : (
                completedSurgeries.map((surgery) => (
                  <div key={surgery.id} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{surgery.procedure_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Patient: {surgery.patients?.first_name} {surgery.patients?.last_name} • Duration: {surgery.duration_minutes ? `${surgery.duration_minutes} min` : 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Completed: {surgery.actual_date ? new Date(surgery.actual_date).toLocaleString() : 'N/A'} • {surgery.surgeon_name || 'Unknown'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-success text-success-foreground">
                        Completed
                      </Badge>
                      <Button size="sm" variant="outline">
                        <FileText className="w-4 h-4 mr-2" />
                        View Report
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Today's Surgeries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">12</div>
                <p className="text-xs text-muted-foreground mt-1">3 in progress</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Average Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">78 min</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-success">-5 min</span> vs avg
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">100%</div>
                <p className="text-xs text-muted-foreground mt-1">Today</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">On-Time Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">94%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-success">+2%</span> improvement
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Surgery Performance Trends</CardTitle>
              <CardDescription>
                Monthly performance metrics and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Performance charts will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}