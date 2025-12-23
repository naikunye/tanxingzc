import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Order, Customer, SupabaseConfig } from '../types.ts';

let supabase: SupabaseClient | null = null;

export const initSupabase = (config: SupabaseConfig) => {
  if (!config.url || !config.url.startsWith('http')) {
    console.warn("Skipping Supabase init: Invalid URL format");
    return false;
  }
  
  if (!config.key) {
    console.warn("Skipping Supabase init: Missing Key");
    return false;
  }

  try {
    supabase = createClient(config.url, config.key);
    return true;
  } catch (e) {
    console.error("Failed to init Supabase", e);
    return false;
  }
};

export const getSupabaseClient = () => supabase;

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

  return data.map((row: any) => ({
    ...row.order_data,
    id: row.id 
  }));
};

export const saveCloudOrder = async (order: Order) => {
  if (!supabase) return;

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

export const fetchCloudCustomers = async (): Promise<Customer[]> => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Supabase fetch error (customers):", error);
    throw error;
  }

  return data.map((row: any) => ({
    ...row.customer_data,
    id: row.id 
  }));
};

export const saveCloudCustomer = async (customer: Customer) => {
  if (!supabase) return;

  const { error } = await supabase
    .from('customers')
    .upsert({ 
        id: customer.id, 
        customer_data: customer,
        updated_at: new Date().toISOString()
    });

  if (error) throw error;
};

export const deleteCloudCustomer = async (id: string) => {
  if (!supabase) return;

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) throw error;
};