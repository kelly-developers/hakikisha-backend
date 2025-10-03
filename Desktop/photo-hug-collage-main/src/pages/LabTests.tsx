import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Activity, Plus, FileText, Clock, CheckCircle, Download, Eye, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LabTest {
  id: string;
  patient_id: string;
  patient_name: string;
  test_type: string;
  test_name: string;
  ordered_by: string;
  ordered_date: string;
  status: 'ordered' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  results?: string;
  notes?: string;
  clinical_notes?: string;
  report_date?: string;
  completed_date?: string;
  created_at: string;
}

export default function LabTests() {
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [testType, setTestType] = useState("");
  const [testName, setTestName] = useState("");
  const [priority, setPriority] = useState("routine");
  const [notes, setNotes] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [testResults, setTestResults] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const storedTests = localStorage.getItem('cvms_lab_tests');
      const storedPatients = localStorage.getItem('cvms_patients') || localStorage.getItem('cardiovascular-patients') || localStorage.getItem('patients');
      
      if (storedTests) {
        const parsedTests = JSON.parse(storedTests);
        setLabTests(Array.isArray(parsedTests) ? parsedTests : []);
      } else {
        setLabTests([]);
      }
      
      if (storedPatients) {
        const parsedPatients = JSON.parse(storedPatients);
        setPatients(Array.isArray(parsedPatients) ? parsedPatients : []);
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setLabTests([]);
      setPatients([]);
    }
  };

  const saveLabTests = (tests: LabTest[]) => {
    localStorage.setItem('cvms_lab_tests', JSON.stringify(tests));
    setLabTests(tests);
  };

  const handleOrderTest = () => {
    if (!selectedPatient || !testType || !testName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const patient = patients.find(p => p.id === selectedPatient);
    if (!patient) {
      toast({
        title: "Error",
        description: "Selected patient not found",
        variant: "destructive",
      });
      return;
    }

    const newTest: LabTest = {
      id: `test_${Date.now()}`,
      patient_id: selectedPatient,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      test_type: testType,
      test_name: testName,
      ordered_by: "Dr. Current User",
      ordered_date: new Date().toISOString(),
      status: 'ordered',
      priority: priority as any,
      notes: notes,
      clinical_notes: clinicalNotes,
      created_at: new Date().toISOString(),
    };

    const updatedTests = [...labTests, newTest];
    saveLabTests(updatedTests);

    toast({
      title: "Test Ordered",
      description: "Lab test has been ordered successfully",
    });

    // Reset form
    setSelectedPatient("");
    setTestType("");
    setTestName("");
    setPriority("routine");
    setNotes("");
    setClinicalNotes("");
  };

  const updateTestStatus = (id: string, status: LabTest['status'], results?: string) => {
    const updatedTests = labTests.map(test => {
      if (test.id === id) {
        const updateData: Partial<LabTest> = { status };
        if (status === 'completed') {
          updateData.completed_date = new Date().toISOString();
          updateData.report_date = new Date().toISOString();
          if (results) {
            updateData.results = results;
          }
        }
        return { ...test, ...updateData };
      }
      return test;
    });
    saveLabTests(updatedTests);
    
    toast({
      title: "Status Updated",
      description: `Test status updated to ${status}`,
    });

    if (status === 'completed') {
      setSelectedTest(null);
      setTestResults("");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'ordered': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const generateTestReport = (test: LabTest) => {
    const report = `
LABORATORY TEST REPORT
===============================

PATIENT INFORMATION:
-------------------
Name: ${test.patient_name}
Patient ID: ${test.patient_id}

TEST DETAILS:
-------------
Test Type: ${test.test_type}
Test Name: ${test.test_name}
Ordered By: ${test.ordered_by}
Order Date: ${new Date(test.ordered_date).toLocaleDateString()}
Priority: ${test.priority.toUpperCase()}

STATUS: ${test.status.toUpperCase()}
${test.completed_date ? `Completed Date: ${new Date(test.completed_date).toLocaleDateString()}` : ''}

CLINICAL NOTES:
--------------
${test.clinical_notes || 'No clinical notes provided'}

TEST NOTES:
-----------
${test.notes || 'No additional notes'}

${test.results ? `
TEST RESULTS:
-------------
${test.results}
` : ''}

${test.report_date ? `
Report Generated: ${new Date(test.report_date).toLocaleString()}
` : ''}
    `.trim();

    return report;
  };

  const downloadReport = (test: LabTest) => {
    const report = generateTestReport(test);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lab_Report_${test.patient_name.replace(/\s+/g, '_')}_${test.test_name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const viewReport = (test: LabTest) => {
    setSelectedTest(test);
  };

  const getTestTypeDisplay = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'blood': 'Blood Test',
      'ct-scan': 'CT Scan',
      'mri': 'MRI',
      'xray': 'X-Ray',
      'ecg': 'ECG/EKG',
      'echo': 'Echocardiogram',
      'stress-test': 'Stress Test',
      'other': 'Other'
    };
    return typeMap[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Laboratory Tests</h1>
        <p className="text-muted-foreground">
          Order and manage lab tests, CT scans, and diagnostic procedures
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order New Test */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Order New Test
            </CardTitle>
            <CardDescription>Request laboratory tests and diagnostic procedures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Patient *</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => {
                    const hasOrderedTests = labTests.some(test => test.patient_id === patient.id && test.status === 'ordered');
                    return (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name} - {patient.patient_id}
                        {hasOrderedTests && " 🔬"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-type">Test Type *</Label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select test type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blood">Blood Test</SelectItem>
                  <SelectItem value="ct-scan">CT Scan</SelectItem>
                  <SelectItem value="mri">MRI</SelectItem>
                  <SelectItem value="xray">X-Ray</SelectItem>
                  <SelectItem value="ecg">ECG/EKG</SelectItem>
                  <SelectItem value="echo">Echocardiogram</SelectItem>
                  <SelectItem value="stress-test">Stress Test</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-name">Specific Test *</Label>
              <Input
                id="test-name"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g., Complete Blood Count, Cardiac MRI"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT (Immediate)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinical-notes">Clinical Notes (Required by Doctor)</Label>
              <Textarea
                id="clinical-notes"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Doctor's notes, suspected conditions, specific areas to examine..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions or additional information"
                rows={2}
              />
            </div>

            <Button onClick={handleOrderTest} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Order Test
            </Button>
          </CardContent>
        </Card>

        {/* Test Orders and Results */}
        <Card className="lg:col-span-2 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Test Orders & Results
            </CardTitle>
            <CardDescription>All laboratory test orders, results, and reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {labTests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No lab tests ordered yet</p>
                </div>
              ) : (
                labTests.map((test) => (
                  <div key={test.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{test.test_name}</h3>
                          <Badge variant="outline">{getTestTypeDisplay(test.test_type)}</Badge>
                          {test.priority === 'stat' && (
                            <Badge variant="destructive" className="text-xs">STAT</Badge>
                          )}
                          {test.priority === 'urgent' && (
                            <Badge variant="secondary" className="text-xs">Urgent</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Patient: {test.patient_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ordered by {test.ordered_by} on {new Date(test.ordered_date).toLocaleDateString()}
                        </p>
                        
                        {/* Clinical Notes Section */}
                        {test.clinical_notes && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border">
                            <p className="text-xs font-medium text-blue-800">Clinical Notes from Doctor:</p>
                            <p className="text-xs text-blue-700 mt-1">{test.clinical_notes}</p>
                          </div>
                        )}

                        {/* Test Notes */}
                        {test.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <span className="font-medium">Additional Notes:</span> {test.notes}
                          </p>
                        )}

                        {/* Test Results */}
                        {test.results && (
                          <div className="mt-2 p-2 bg-green-50 rounded border">
                            <p className="text-xs font-medium text-green-800">Test Results:</p>
                            <p className="text-xs text-green-700 mt-1 whitespace-pre-wrap">{test.results}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(test.status)}`} />
                        <Badge>{test.status}</Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      {test.status === 'ordered' && (
                        <Button size="sm" variant="outline" onClick={() => updateTestStatus(test.id, 'in-progress')}>
                          <Clock className="w-3 h-3 mr-1" />
                          Start Test
                        </Button>
                      )}
                      {test.status === 'in-progress' && (
                        <Button size="sm" variant="outline" onClick={() => viewReport(test)}>
                          <FileText className="w-3 h-3 mr-1" />
                          Enter Results
                        </Button>
                      )}
                      {test.status === 'completed' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => viewReport(test)}>
                            <Eye className="w-3 h-3 mr-1" />
                            View Report
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => downloadReport(test)}>
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </>
                      )}
                      {test.status !== 'cancelled' && test.status !== 'completed' && (
                        <Button size="sm" variant="destructive" onClick={() => updateTestStatus(test.id, 'cancelled')}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {selectedTest.status === 'in-progress' ? 'Enter Test Results' : 'Test Report'}
              </CardTitle>
              <CardDescription>
                {selectedTest.test_name} for {selectedTest.patient_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTest.status === 'in-progress' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="test-results">Test Results *</Label>
                    <Textarea
                      id="test-results"
                      value={testResults}
                      onChange={(e) => setTestResults(e.target.value)}
                      placeholder="Enter detailed test results, findings, measurements, and interpretations..."
                      rows={8}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setSelectedTest(null)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => updateTestStatus(selectedTest.id, 'completed', testResults)}
                      disabled={!testResults.trim()}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Test
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 bg-muted rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">
                      {generateTestReport(selectedTest)}
                    </pre>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setSelectedTest(null)}>
                      Close
                    </Button>
                    <Button onClick={() => downloadReport(selectedTest)}>
                      <FileDown className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}