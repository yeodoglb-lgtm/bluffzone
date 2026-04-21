import { useQuery } from '@tanstack/react-query';
import { fetchPlaces, fetchPlace, fetchFeaturedPlaces } from '../services/places';

export function usePlaces(search?: string) {
  return useQuery({
    queryKey: ['places', search],
    queryFn: () => fetchPlaces(search),
    staleTime: 1000 * 60 * 5,
  });
}

export function usePlace(id: string) {
  return useQuery({
    queryKey: ['places', id],
    queryFn: () => fetchPlace(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useFeaturedPlaces() {
  return useQuery({
    queryKey: ['places', 'featured'],
    queryFn: fetchFeaturedPlaces,
    staleTime: 1000 * 60 * 10,
  });
}
