import { supabase } from './supabase';
import type { Place } from '../types/database';

export async function fetchPlaces(search?: string): Promise<Place[]> {
  let query = supabase
    .from('places')
    .select('*')
    .eq('is_active', true)
    .order('featured', { ascending: false })
    .order('name', { ascending: true });

  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    // 이름 OR 주소 OR 도로명 주소에서 검색
    query = query.or(`name.ilike.${term},address.ilike.${term},road_address.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Place[];
}

export async function fetchPlace(id: string): Promise<Place | null> {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Place;
}

export async function fetchFeaturedPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('is_active', true)
    .eq('featured', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Place[];
}
