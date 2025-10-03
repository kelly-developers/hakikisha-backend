import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_history?: string;
  allergies?: string;
  current_medications?: string;
  created_at: string;
  updated_at: string;
}

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPatients = async () => {
    try {
      const storedPatients = localStorage.getItem('patients');
      const patients = storedPatients ? JSON.parse(storedPatients) : [];
      setPatients(patients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch patients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPatient = async (patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newPatient: Patient = {
        ...patientData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const storedPatients = localStorage.getItem('patients');
      const patients = storedPatients ? JSON.parse(storedPatients) : [];
      const updatedPatients = [newPatient, ...patients];
      
      localStorage.setItem('patients', JSON.stringify(updatedPatients));
      setPatients(updatedPatients);
      
      toast({
        title: "Success",
        description: "Patient added successfully",
      });
      return newPatient;
    } catch (error) {
      console.error('Error adding patient:', error);
      toast({
        title: "Error",
        description: "Failed to add patient",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePatient = async (id: string, patientData: Partial<Patient>) => {
    try {
      const storedPatients = localStorage.getItem('patients');
      const patients = storedPatients ? JSON.parse(storedPatients) : [];
      
      const updatedPatients = patients.map((p: Patient) => 
        p.id === id ? { ...p, ...patientData, updated_at: new Date().toISOString() } : p
      );
      
      localStorage.setItem('patients', JSON.stringify(updatedPatients));
      setPatients(updatedPatients);
      
      const updatedPatient = updatedPatients.find((p: Patient) => p.id === id);
      
      toast({
        title: "Success",
        description: "Patient updated successfully",
      });
      return updatedPatient;
    } catch (error) {
      console.error('Error updating patient:', error);
      toast({
        title: "Error",
        description: "Failed to update patient",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePatient = async (id: string) => {
    try {
      const storedPatients = localStorage.getItem('patients');
      const patients = storedPatients ? JSON.parse(storedPatients) : [];
      
      const updatedPatients = patients.filter((p: Patient) => p.id !== id);
      localStorage.setItem('patients', JSON.stringify(updatedPatients));
      setPatients(updatedPatients);
      
      toast({
        title: "Success",
        description: "Patient deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: "Error",
        description: "Failed to delete patient",
        variant: "destructive",
      });
      throw error;
    }
  };

  const searchPatients = async (query: string) => {
    try {
      setLoading(true);
      const storedPatients = localStorage.getItem('patients');
      const allPatients = storedPatients ? JSON.parse(storedPatients) : [];
      
      const filteredPatients = allPatients.filter((patient: Patient) =>
        patient.first_name.toLowerCase().includes(query.toLowerCase()) ||
        patient.last_name.toLowerCase().includes(query.toLowerCase()) ||
        patient.patient_id.toLowerCase().includes(query.toLowerCase()) ||
        (patient.email && patient.email.toLowerCase().includes(query.toLowerCase()))
      );
      
      setPatients(filteredPatients);
    } catch (error) {
      console.error('Error searching patients:', error);
      toast({
        title: "Error",
        description: "Failed to search patients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  return {
    patients,
    loading,
    addPatient,
    updatePatient,
    deletePatient,
    searchPatients,
    refreshPatients: fetchPatients,
  };
}