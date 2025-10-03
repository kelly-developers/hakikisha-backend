import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Star,
  User, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Send,
  Eye,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FeedbackPlatform() {
  const [activeTab, setActiveTab] = useState("patient");
  const { toast } = useToast();

  const patientFeedback = [
    {
      id: "F001",
      patientName: "John Doe",
      patientId: "P001",
      procedure: "Appendectomy",
      surgeonName: "Dr. Smith",
      submittedDate: "2024-01-20",
      rating: 5,
      category: "Overall Experience",
      feedback: "Excellent care throughout my surgery. The surgical team was professional and caring. Recovery has been smooth and all my questions were answered promptly.",
      status: "New",
      priority: "Low"
    },
    {
      id: "F002",
      patientName: "Alice Johnson",
      patientId: "P002", 
      procedure: "Cholecystectomy",
      surgeonName: "Dr. Johnson",
      submittedDate: "2024-01-19",
      rating: 3,
      category: "Pain Management",
      feedback: "The surgery went well but I experienced more pain than expected during recovery. Would appreciate better pain management options for future patients.",
      status: "Requires Response",
      priority: "Medium"
    },
    {
      id: "F003",
      patientName: "Sarah Williams",
      patientId: "P003",
      procedure: "Hernia Repair",
      surgeonName: "Dr. Brown",
      submittedDate: "2024-01-18",
      rating: 2,
      category: "Communication",
      feedback: "While the surgery was successful, I felt there was a lack of communication about post-operative care instructions. This caused confusion during my recovery.",
      status: "Urgent",
      priority: "High"
    }
  ];

  const specialistResponses = [
    {
      id: "R001",
      feedbackId: "F002",
      specialistName: "Dr. Martinez - Pain Management Specialist",
      responseDate: "2024-01-21",
      response: "Thank you for your feedback. We take pain management seriously and I would like to schedule a consultation to discuss better options for your recovery. Our team will also review our current protocols.",
      status: "Sent"
    }
  ];

  const feedbackAnalytics = {
    averageRating: 4.2,
    totalFeedback: 156,
    responseRate: 95,
    categories: [
      { name: "Overall Experience", rating: 4.5, count: 45 },
      { name: "Surgical Care", rating: 4.7, count: 52 },
      { name: "Pain Management", rating: 3.8, count: 28 },
      { name: "Communication", rating: 4.1, count: 31 }
    ]
  };

  const handleRespondToFeedback = (feedbackId: string) => {
    toast({
      title: "Response sent",
      description: `Your response to feedback ${feedbackId} has been sent to the patient.`,
    });
  };

  const handleAssignSpecialist = (feedbackId: string) => {
    toast({
      title: "Specialist assigned",
      description: `Feedback ${feedbackId} has been assigned to a specialist for response.`,
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Feedback Platform</h1>
        <p className="text-muted-foreground">
          Patient feedback management and specialist response system
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="patient">
            Patient Feedback ({patientFeedback.length})
          </TabsTrigger>
          <TabsTrigger value="responses">Specialist Responses</TabsTrigger>
          <TabsTrigger value="analytics">Feedback Analytics</TabsTrigger>
          <TabsTrigger value="settings">Platform Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="patient" className="space-y-6">
          <div className="grid gap-6">
            {patientFeedback.map((feedback) => (
              <Card key={feedback.id} className="bg-gradient-card shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-medical rounded-full flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">
                          Feedback - {feedback.id}
                        </CardTitle>
                        <CardDescription>
                          {feedback.patientName} • {feedback.procedure}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge 
                        variant={feedback.status === 'Urgent' ? 'destructive' : 
                                feedback.status === 'Requires Response' ? 'default' : 'secondary'}
                      >
                        {feedback.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {feedback.submittedDate}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Feedback Details */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Patient Information</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">
                              Patient
                            </Label>
                            <p className="text-foreground">{feedback.patientName}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">
                              Patient ID
                            </Label>
                            <p className="text-foreground">{feedback.patientId}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">
                              Procedure
                            </Label>
                            <p className="text-foreground">{feedback.procedure}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">
                              Surgeon
                            </Label>
                            <p className="text-foreground">{feedback.surgeonName}</p>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Feedback Category
                          </Label>
                          <p className="text-foreground">{feedback.category}</p>
                        </div>
                      </div>
                    </div>

                    {/* Rating and Priority */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Rating & Priority</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Overall Rating
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">{renderStars(feedback.rating)}</div>
                            <span className="text-lg font-bold text-foreground">
                              {feedback.rating}/5
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Priority Level
                          </Label>
                          <Badge 
                            variant={feedback.priority === 'High' ? 'destructive' : 
                                    feedback.priority === 'Medium' ? 'default' : 'secondary'}
                            className="mt-1"
                          >
                            {feedback.priority} Priority
                          </Badge>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Submitted Date
                          </Label>
                          <p className="text-foreground">{feedback.submittedDate}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Feedback Content */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Patient Feedback</h3>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-foreground">{feedback.feedback}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Response Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Specialist Response</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Assign to Specialist</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select specialist" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pain-mgmt">Dr. Martinez - Pain Management</SelectItem>
                            <SelectItem value="surgery">Dr. Smith - Chief Surgeon</SelectItem>
                            <SelectItem value="nursing">Nurse Supervisor</SelectItem>
                            <SelectItem value="admin">Patient Relations</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Response Message</Label>
                        <Textarea 
                          placeholder="Type your response to the patient's feedback..."
                          className="h-24"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      className="bg-gradient-medical text-white"
                      onClick={() => handleRespondToFeedback(feedback.id)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Response
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleAssignSpecialist(feedback.id)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Assign Specialist
                    </Button>
                    <Button variant="ghost">
                      <Eye className="w-4 h-4 mr-2" />
                      View History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="responses" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Specialist Responses
              </CardTitle>
              <CardDescription>
                Responses from specialists to patient feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {specialistResponses.map((response) => (
                <div key={response.id} className="p-4 bg-background rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium text-foreground">{response.specialistName}</div>
                      <div className="text-sm text-muted-foreground">
                        Response to Feedback {response.feedbackId} • {response.responseDate}
                      </div>
                    </div>
                    <Badge variant="default">{response.status}</Badge>
                  </div>
                  <div className="bg-muted/50 p-3 rounded">
                    <p className="text-foreground text-sm">{response.response}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Average Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-foreground">{feedbackAnalytics.averageRating}</div>
                  <div className="flex">{renderStars(Math.round(feedbackAnalytics.averageRating))}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Overall satisfaction</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{feedbackAnalytics.totalFeedback}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-success">+12</span> this month
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Response Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{feedbackAnalytics.responseRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Within 24 hours</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Improvement Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">+0.3</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-success">↗</span> vs last quarter
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Feedback by Category</CardTitle>
              <CardDescription>
                Patient satisfaction ratings across different categories
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {feedbackAnalytics.categories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">{category.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {category.count} responses
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex">{renderStars(Math.round(category.rating))}</div>
                      <div className="text-lg font-bold text-foreground">{category.rating}</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Feedback Platform Settings</CardTitle>
              <CardDescription>
                Configure feedback collection and response workflows
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Notification Settings</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Email notifications for new feedback</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">SMS alerts for urgent feedback</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Daily summary reports</span>
                      <Badge variant="outline">Disabled</Badge>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold mb-3">Response Targets</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Standard response time</span>
                      <span className="text-sm font-medium">24 hours</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Urgent response time</span>
                      <span className="text-sm font-medium">4 hours</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Escalation threshold</span>
                      <span className="text-sm font-medium">48 hours</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}