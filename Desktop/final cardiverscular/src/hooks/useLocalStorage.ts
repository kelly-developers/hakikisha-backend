import { useState, useEffect } from 'react';

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

export interface VitalData {
  id: string;
  patient_id: string;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  heart_rate: number;
  temperature: number;
  respiratory_rate: number;
  oxygen_saturation: number;
  weight: number;
  height: number;
  bmi: number;
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  type: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface DoctorAnalysis {
  id: string;
  patient_id: string;
  doctor_id: string;
  diagnosis: string;
  recommended_surgery?: string;
  surgery_urgency?: string;
  clinical_notes?: string;
  status: string;
  created_at: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  created_at: string;
}

// User account interface
interface UserAccount {
  username: string;
  password: string;
}

// Authentication
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const authStatus = localStorage.getItem('cvms_auth');
    const user = localStorage.getItem('cvms_user');
    setIsAuthenticated(authStatus === 'true');
    setCurrentUser(user);
  }, []);

  const signup = (username: string, password: string) => {
    // Get existing accounts
    const accountsJson = localStorage.getItem('cvms_accounts');
    const accounts: UserAccount[] = accountsJson ? JSON.parse(accountsJson) : [];
    
    // Check if username already exists
    if (accounts.some(acc => acc.username === username)) {
      return { success: false, error: 'Username already exists' };
    }
    
    // Create new account
    accounts.push({ username, password });
    localStorage.setItem('cvms_accounts', JSON.stringify(accounts));
    
    return { success: true };
  };

  const login = (username: string, password: string) => {
    // Get existing accounts
    const accountsJson = localStorage.getItem('cvms_accounts');
    const accounts: UserAccount[] = accountsJson ? JSON.parse(accountsJson) : [];
    
    // Find matching account
    const account = accounts.find(
      acc => acc.username === username && acc.password === password
    );
    
    if (account) {
      localStorage.setItem('cvms_auth', 'true');
      localStorage.setItem('cvms_user', username);
      setIsAuthenticated(true);
      setCurrentUser(username);
      return { success: true };
    }
    
    return { success: false, error: 'Invalid username or password' };
  };

  const logout = () => {
    localStorage.removeItem('cvms_auth');
    localStorage.removeItem('cvms_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  return { isAuthenticated, currentUser, login, logout, signup };
}

// Patients
export function useLocalPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    const savedPatients = localStorage.getItem('cvms_patients');
    if (savedPatients) {
      setPatients(JSON.parse(savedPatients));
    }
  }, []);

  const savePatients = (newPatients: Patient[]) => {
    localStorage.setItem('cvms_patients', JSON.stringify(newPatients));
    setPatients(newPatients);
  };

  const addPatient = (patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => {
    const newPatient: Patient = {
      ...patientData,
      id: `patient_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updatedPatients = [...patients, newPatient];
    savePatients(updatedPatients);
    return newPatient;
  };

  const updatePatient = (id: string, patientData: Partial<Patient>) => {
    const updatedPatients = patients.map(p => 
      p.id === id ? { ...p, ...patientData, updated_at: new Date().toISOString() } : p
    );
    savePatients(updatedPatients);
  };

  const getPatientById = (id: string) => {
    return patients.find(p => p.id === id);
  };

  return { patients, addPatient, updatePatient, getPatientById };
}

// Vital Data
export function useLocalVitalData() {
  const [vitalData, setVitalData] = useState<VitalData[]>([]);

  useEffect(() => {
    const savedVitalData = localStorage.getItem('cvms_vital_data');
    if (savedVitalData) {
      setVitalData(JSON.parse(savedVitalData));
    }
  }, []);

  const saveVitalData = (newVitalData: VitalData[]) => {
    localStorage.setItem('cvms_vital_data', JSON.stringify(newVitalData));
    setVitalData(newVitalData);
  };

  const addVitalData = (data: Omit<VitalData, 'id' | 'created_at'>) => {
    const newVitalData: VitalData = {
      ...data,
      id: `vital_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const updatedVitalData = [...vitalData, newVitalData];
    saveVitalData(updatedVitalData);
    return newVitalData;
  };

  const getVitalDataByPatient = (patientId: string) => {
    return vitalData.filter(v => v.patient_id === patientId);
  };

  return { vitalData, addVitalData, getVitalDataByPatient };
}

// Appointments
export function useLocalAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const savedAppointments = localStorage.getItem('cvms_appointments');
    if (savedAppointments) {
      setAppointments(JSON.parse(savedAppointments));
    }
  }, []);

  const saveAppointments = (newAppointments: Appointment[]) => {
    localStorage.setItem('cvms_appointments', JSON.stringify(newAppointments));
    setAppointments(newAppointments);
  };

  const addAppointment = (appointmentData: Omit<Appointment, 'id' | 'created_at'>) => {
    const newAppointment: Appointment = {
      ...appointmentData,
      id: `appointment_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const updatedAppointments = [...appointments, newAppointment];
    saveAppointments(updatedAppointments);
    return newAppointment;
  };

  const updateAppointment = (id: string, appointmentData: Partial<Appointment>) => {
    const updatedAppointments = appointments.map(a => 
      a.id === id ? { ...a, ...appointmentData } : a
    );
    saveAppointments(updatedAppointments);
  };

  return { appointments, addAppointment, updateAppointment };
}

// Doctor Analysis
export function useLocalAnalysis() {
  const [analyses, setAnalyses] = useState<DoctorAnalysis[]>([]);

  useEffect(() => {
    const savedAnalyses = localStorage.getItem('cvms_analyses');
    if (savedAnalyses) {
      setAnalyses(JSON.parse(savedAnalyses));
    }
  }, []);

  const saveAnalyses = (newAnalyses: DoctorAnalysis[]) => {
    localStorage.setItem('cvms_analyses', JSON.stringify(newAnalyses));
    setAnalyses(newAnalyses);
  };

  const addAnalysis = (analysisData: Omit<DoctorAnalysis, 'id' | 'created_at'>) => {
    const newAnalysis: DoctorAnalysis = {
      ...analysisData,
      id: `analysis_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const updatedAnalyses = [...analyses, newAnalysis];
    saveAnalyses(updatedAnalyses);
    return newAnalysis;
  };

  const getAnalysesByPatient = (patientId: string) => {
    return analyses.filter(a => a.patient_id === patientId);
  };

  return { analyses, addAnalysis, getAnalysesByPatient };
}

// Prescriptions
export function useLocalPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  useEffect(() => {
    const savedPrescriptions = localStorage.getItem('cvms_prescriptions');
    if (savedPrescriptions) {
      setPrescriptions(JSON.parse(savedPrescriptions));
    }
  }, []);

  const savePrescriptions = (newPrescriptions: Prescription[]) => {
    localStorage.setItem('cvms_prescriptions', JSON.stringify(newPrescriptions));
    setPrescriptions(newPrescriptions);
  };

  const addPrescription = (prescriptionData: Omit<Prescription, 'id' | 'created_at'>) => {
    const newPrescription: Prescription = {
      ...prescriptionData,
      id: `prescription_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const updatedPrescriptions = [...prescriptions, newPrescription];
    savePrescriptions(updatedPrescriptions);
    return newPrescription;
  };

  const getPrescriptionsByPatient = (patientId: string) => {
    return prescriptions.filter(p => p.patient_id === patientId);
  };

  return { prescriptions, addPrescription, getPrescriptionsByPatient };
}