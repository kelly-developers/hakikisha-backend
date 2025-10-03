-- Create patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  medical_history TEXT,
  allergies TEXT,
  current_medications TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create surgical procedures table
CREATE TABLE public.surgical_procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  procedure_name VARCHAR(255) NOT NULL,
  procedure_type VARCHAR(100),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  actual_date TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  surgeon_name VARCHAR(100),
  assistant_surgeon VARCHAR(100),
  anesthesia_type VARCHAR(50),
  pre_operative_notes TEXT,
  operative_notes TEXT,
  post_operative_notes TEXT,
  complications TEXT,
  status VARCHAR(50) DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create procedure outcomes table
CREATE TABLE public.procedure_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  procedure_id UUID REFERENCES public.surgical_procedures(id) ON DELETE CASCADE,
  outcome_type VARCHAR(100),
  outcome_description TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  recovery_status VARCHAR(50),
  patient_satisfaction_score INTEGER CHECK (patient_satisfaction_score >= 1 AND patient_satisfaction_score <= 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surgical_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_outcomes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for patients
CREATE POLICY "Users can view their own patients" 
ON public.patients FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patients" 
ON public.patients FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patients" 
ON public.patients FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patients" 
ON public.patients FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for surgical procedures
CREATE POLICY "Users can view their own procedures" 
ON public.surgical_procedures FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own procedures" 
ON public.surgical_procedures FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own procedures" 
ON public.surgical_procedures FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own procedures" 
ON public.surgical_procedures FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for procedure outcomes
CREATE POLICY "Users can view their own outcomes" 
ON public.procedure_outcomes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own outcomes" 
ON public.procedure_outcomes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outcomes" 
ON public.procedure_outcomes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outcomes" 
ON public.procedure_outcomes FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_patients_user_id ON public.patients(user_id);
CREATE INDEX idx_patients_patient_id ON public.patients(patient_id);
CREATE INDEX idx_procedures_user_id ON public.surgical_procedures(user_id);
CREATE INDEX idx_procedures_patient_id ON public.surgical_procedures(patient_id);
CREATE INDEX idx_outcomes_user_id ON public.procedure_outcomes(user_id);
CREATE INDEX idx_outcomes_procedure_id ON public.procedure_outcomes(procedure_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_procedures_updated_at
  BEFORE UPDATE ON public.surgical_procedures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();