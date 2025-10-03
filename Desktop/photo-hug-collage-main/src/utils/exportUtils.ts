import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Patient, VitalData, Appointment, DoctorAnalysis, Prescription } from '@/hooks/useLocalStorage';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface PatientReport {
  patient: Patient;
  vitalData: VitalData[];
  appointments: Appointment[];
  analyses: DoctorAnalysis[];
  prescriptions: Prescription[];
}

export function exportToCSV(data: PatientReport[], filename: string = 'patient_data.csv') {
  const csvContent = generateCSVContent(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function exportToPDF(data: PatientReport[], filename: string = 'patient_report.pdf') {
  const doc = new jsPDF();
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Cardiovascular Patient Management System', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 20, yPosition);
  yPosition += 20;

  data.forEach((patientReport, index) => {
    if (index > 0) {
      doc.addPage();
      yPosition = 20;
    }

    // Patient Information
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Patient: ${patientReport.patient.first_name} ${patientReport.patient.last_name}`, 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Patient details table
    const patientData = [
      ['Patient ID', patientReport.patient.patient_id],
      ['Date of Birth', new Date(patientReport.patient.date_of_birth).toLocaleDateString()],
      ['Gender', patientReport.patient.gender || 'Not specified'],
      ['Phone', patientReport.patient.phone || 'Not provided'],
      ['Email', patientReport.patient.email || 'Not provided'],
      ['Emergency Contact', `${patientReport.patient.emergency_contact_name || 'N/A'} - ${patientReport.patient.emergency_contact_phone || 'N/A'}`],
      ['Medical History', patientReport.patient.medical_history || 'None recorded'],
      ['Allergies', patientReport.patient.allergies || 'None recorded'],
      ['Current Medications', patientReport.patient.current_medications || 'None recorded'],
    ];

    doc.autoTable({
      startY: yPosition,
      head: [['Field', 'Value']],
      body: patientData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Vital Signs
    if (patientReport.vitalData.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Vital Signs History', 20, yPosition);
      yPosition += 10;

      const vitalHeaders = ['Date', 'BP (sys/dia)', 'Heart Rate', 'Temperature', 'Resp. Rate', 'O2 Sat', 'Weight', 'Height', 'BMI'];
      const vitalBody = patientReport.vitalData.map(vital => [
        new Date(vital.created_at).toLocaleDateString(),
        `${vital.blood_pressure_systolic}/${vital.blood_pressure_diastolic}`,
        `${vital.heart_rate} bpm`,
        `${vital.temperature}°F`,
        `${vital.respiratory_rate}/min`,
        `${vital.oxygen_saturation}%`,
        `${vital.weight} lbs`,
        `${vital.height} in`,
        vital.bmi.toFixed(1)
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [vitalHeaders],
        body: vitalBody,
        theme: 'grid',
        styles: { fontSize: 7 },
        headStyles: { fillColor: [40, 167, 69] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Appointments
    if (patientReport.appointments.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Appointments', 20, yPosition);
      yPosition += 10;

      const appointmentHeaders = ['Date', 'Time', 'Type', 'Doctor', 'Status', 'Notes'];
      const appointmentBody = patientReport.appointments.map(apt => [
        apt.appointment_date,
        apt.appointment_time,
        apt.type,
        apt.doctor_id,
        apt.status,
        apt.notes || 'None'
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [appointmentHeaders],
        body: appointmentBody,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [255, 193, 7] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Doctor Analyses
    if (patientReport.analyses.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Medical Analyses', 20, yPosition);
      yPosition += 10;

      patientReport.analyses.forEach(analysis => {
        const analysisData = [
          ['Date', new Date(analysis.created_at).toLocaleDateString()],
          ['Doctor', analysis.doctor_id],
          ['Diagnosis', analysis.diagnosis],
          ['Recommended Surgery', analysis.recommended_surgery || 'None'],
          ['Surgery Urgency', analysis.surgery_urgency || 'N/A'],
          ['Status', analysis.status],
          ['Clinical Notes', analysis.clinical_notes || 'None']
        ];

        doc.autoTable({
          startY: yPosition,
          head: [['Field', 'Details']],
          body: analysisData,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [220, 53, 69] },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      });
    }

    // Prescriptions
    if (patientReport.prescriptions.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Prescriptions', 20, yPosition);
      yPosition += 10;

      const prescriptionHeaders = ['Date', 'Medication', 'Dosage', 'Frequency', 'Duration', 'Instructions'];
      const prescriptionBody = patientReport.prescriptions.map(rx => [
        new Date(rx.created_at).toLocaleDateString(),
        rx.medication_name,
        rx.dosage,
        rx.frequency,
        rx.duration,
        rx.instructions || 'None'
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [prescriptionHeaders],
        body: prescriptionBody,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [111, 66, 193] },
      });
    }
  });

  doc.save(filename);
}

function generateCSVContent(data: PatientReport[]): string {
  let csv = 'Patient ID,First Name,Last Name,Date of Birth,Gender,Phone,Email,Medical History,Allergies,Current Medications,';
  csv += 'Vital Date,BP Systolic,BP Diastolic,Heart Rate,Temperature,Respiratory Rate,O2 Saturation,Weight,Height,BMI,';
  csv += 'Appointment Date,Appointment Time,Appointment Type,Doctor,Appointment Status,Appointment Notes,';
  csv += 'Analysis Date,Diagnosis,Recommended Surgery,Surgery Urgency,Analysis Status,Clinical Notes,';
  csv += 'Prescription Date,Medication,Dosage,Frequency,Duration,Prescription Instructions\n';

  data.forEach(patientReport => {
    const patient = patientReport.patient;
    const maxRows = Math.max(
      patientReport.vitalData.length,
      patientReport.appointments.length,
      patientReport.analyses.length,
      patientReport.prescriptions.length,
      1
    );

    for (let i = 0; i < maxRows; i++) {
      let row = '';
      
      // Patient data (only on first row)
      if (i === 0) {
        row += `"${patient.patient_id}","${patient.first_name}","${patient.last_name}","${patient.date_of_birth}","${patient.gender || ''}","${patient.phone || ''}","${patient.email || ''}","${patient.medical_history || ''}","${patient.allergies || ''}","${patient.current_medications || ''}",`;
      } else {
        row += ',,,,,,,,,,';
      }

      // Vital data
      if (i < patientReport.vitalData.length) {
        const vital = patientReport.vitalData[i];
        row += `"${new Date(vital.created_at).toLocaleDateString()}","${vital.blood_pressure_systolic}","${vital.blood_pressure_diastolic}","${vital.heart_rate}","${vital.temperature}","${vital.respiratory_rate}","${vital.oxygen_saturation}","${vital.weight}","${vital.height}","${vital.bmi}",`;
      } else {
        row += ',,,,,,,,,,';
      }

      // Appointment data
      if (i < patientReport.appointments.length) {
        const apt = patientReport.appointments[i];
        row += `"${apt.appointment_date}","${apt.appointment_time}","${apt.type}","${apt.doctor_id}","${apt.status}","${apt.notes || ''}",`;
      } else {
        row += ',,,,,,';
      }

      // Analysis data
      if (i < patientReport.analyses.length) {
        const analysis = patientReport.analyses[i];
        row += `"${new Date(analysis.created_at).toLocaleDateString()}","${analysis.diagnosis}","${analysis.recommended_surgery || ''}","${analysis.surgery_urgency || ''}","${analysis.status}","${analysis.clinical_notes || ''}",`;
      } else {
        row += ',,,,,,';
      }

      // Prescription data
      if (i < patientReport.prescriptions.length) {
        const rx = patientReport.prescriptions[i];
        row += `"${new Date(rx.created_at).toLocaleDateString()}","${rx.medication_name}","${rx.dosage}","${rx.frequency}","${rx.duration}","${rx.instructions || ''}"`;
      } else {
        row += ',,,,,';
      }

      csv += row + '\n';
    }
  });

  return csv;
}