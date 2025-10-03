import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SurgicalProcedure {
  id: string;
  patient_id: string;
  procedure_name: string;
  procedure_type?: string;
  scheduled_date?: string;
  actual_date?: string;
  duration_minutes?: number;
  surgeon_name?: string;
  assistant_surgeon?: string;
  anesthesia_type?: string;
  pre_operative_notes?: string;
  operative_notes?: string;
  post_operative_notes?: string;
  complications?: string;
  status: string;
  created_at: string;
  updated_at: string;
  patients?: {
    first_name: string;
    last_name: string;
    patient_id: string;
  };
}

export function useProcedures() {
  const [procedures, setProcedures] = useState<SurgicalProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProcedures = async () => {
    try {
      const { data, error } = await supabase
        .from('surgical_procedures')
        .select(`
          *,
          patients (
            first_name,
            last_name,
            patient_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProcedures(data || []);
    } catch (error) {
      console.error('Error fetching procedures:', error);
      toast({
        title: "Error",
        description: "Failed to fetch procedures",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addProcedure = async (procedureData: Omit<SurgicalProcedure, 'id' | 'created_at' | 'updated_at' | 'patients'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('surgical_procedures')
        .insert([{ ...procedureData, user_id: user.id }])
        .select(`
          *,
          patients (
            first_name,
            last_name,
            patient_id
          )
        `)
        .single();

      if (error) throw error;

      setProcedures(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Procedure added successfully",
      });
      return data;
    } catch (error) {
      console.error('Error adding procedure:', error);
      toast({
        title: "Error",
        description: "Failed to add procedure",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProcedure = async (id: string, procedureData: Partial<SurgicalProcedure>) => {
    try {
      const { data, error } = await supabase
        .from('surgical_procedures')
        .update(procedureData)
        .eq('id', id)
        .select(`
          *,
          patients (
            first_name,
            last_name,
            patient_id
          )
        `)
        .single();

      if (error) throw error;

      setProcedures(prev => prev.map(p => p.id === id ? data : p));
      toast({
        title: "Success",
        description: "Procedure updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating procedure:', error);
      toast({
        title: "Error",
        description: "Failed to update procedure",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteProcedure = async (id: string) => {
    try {
      const { error } = await supabase
        .from('surgical_procedures')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProcedures(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Success",
        description: "Procedure deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting procedure:', error);
      toast({
        title: "Error",
        description: "Failed to delete procedure",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchProcedures();
  }, []);

  return {
    procedures,
    loading,
    addProcedure,
    updateProcedure,
    deleteProcedure,
    refreshProcedures: fetchProcedures,
  };
}