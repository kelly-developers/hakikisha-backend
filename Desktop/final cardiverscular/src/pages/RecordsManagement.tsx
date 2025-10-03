import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Database, Search, Users, FileText, Calendar, Download, Activity, TrendingUp } from "lucide-react";
import { usePatients } from "@/hooks/usePatients";
import { useProcedures } from "@/hooks/useProcedures";
import PatientList from "@/components/PatientList";
import ExportData from "@/components/ExportData";

export default function RecordsManagement() {
  const { patients } = usePatients();
  const { procedures } = useProcedures();

  const activePatients = patients.filter(p => 
    procedures.some(proc => proc.patient_id === p.id && proc.status !== 'completed')
  ).length;

  const completedProcedures = procedures.filter(p => p.status === 'completed').length;
  const dataIntegrity = patients.length > 0 ? 
    ((patients.filter(p => p.medical_history && p.emergency_contact_name).length / patients.length) * 100).toFixed(1) : 
    '100';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Records Management</h1>
        <p className="text-muted-foreground">
          Comprehensive patient data and surgical history management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Total Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{patients.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Active Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activePatients}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Total Procedures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{procedures.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Procedures logged</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Data Integrity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{dataIntegrity}%</div>
            <p className="text-xs text-muted-foreground mt-1">Quality score</p>
          </CardContent>
        </Card>
      </div>

      <ExportData />

      <PatientList />
    </div>
  );
}