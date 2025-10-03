import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, User, FileText, Heart, AlertTriangle, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePatients } from "@/hooks/usePatients";
import PatientForm from "@/components/PatientForm";

export default function PatientOnboarding() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [activeTab, setActiveTab] = useState("new");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { patients, addPatient, searchPatients } = usePatients();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchPatients(searchQuery);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Patient Onboarding</h1>
        <p className="text-muted-foreground">
          Register new patients and manage existing patient information
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new">New Patient</TabsTrigger>
          <TabsTrigger value="search">Search Patients</TabsTrigger>
          <TabsTrigger value="recent">Recent Registrations</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Patient Registration Form
              </CardTitle>
              <CardDescription>
                Complete patient information for surgical assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PatientForm onSubmit={addPatient} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Search Patients
              </CardTitle>
              <CardDescription>
                Find existing patients in the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input 
                    placeholder="Search by name, ID, or email..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch}>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
              
              {searchQuery && patients.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No patients found matching "{searchQuery}"
                </div>
              )}
              
              {searchQuery && patients.length > 0 && (
                <div className="space-y-4">
                  {patients.map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">
                          {patient.first_name} {patient.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {patient.patient_id} • DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
                        </div>
                        {patient.email && (
                          <div className="text-xs text-muted-foreground">
                            Email: {patient.email}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Active</Badge>
                        <Button size="sm" variant="outline" onClick={() => window.location.href = '/records'}>
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {!searchQuery && (
                <div className="text-center text-muted-foreground py-8">
                  Enter search criteria to find patients
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Recent Registrations
              </CardTitle>
              <CardDescription>
                Recently registered patients awaiting assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {patients.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No patients registered yet
                </div>
              ) : (
                patients.slice(0, 5).map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {patient.first_name} {patient.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {patient.patient_id} • DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Registered: {new Date(patient.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        Registered
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => window.location.href = '/records'}>
                        View Details
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}