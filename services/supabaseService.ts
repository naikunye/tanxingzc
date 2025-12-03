import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Order, SupabaseConfig } from '../types';

let supabase: SupabaseClient | null = null;

export const initSupabase = (config: SupabaseConfig) => {
  try {
    supabase = createClient(config.url, config.key);
    return true;
  } catch (e) {
    console.error("Failed to init Supabase", e);
    return false;
  }
};

export const getSupabaseClient = () => supabase;

// We use a simplified table structure: 
// Table Name: 'orders'
// Columns: id (text/uuid, PK), order_data (jsonb)
// This allows flexible schema evolution without complex SQL migrations for the user.

export const fetchCloudOrders = async (): Promise<Order[]> => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Supabase fetch error:", error);
    throw error;
  }

  // Map back from JSON storage
  return data.map((row: any) => ({
    ...row.order_data,
    id: row.id // Ensure ID matches
  }));
};

export const saveCloudOrder = async (order: Order) => {
  if (!supabase) return;

  // Upsert: Insert or Update based on ID
  const { error } = await supabase
    .from('orders')
    .upsert({ 
        id: order.id, 
        order_data: order,
        updated_at: new Date().toISOString()
    });

  if (error) throw error;
};

export const deleteCloudOrder = async (id: string) => {
  if (!supabase) return;

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) throw error;
};