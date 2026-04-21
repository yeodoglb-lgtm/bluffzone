import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { fetchAdminOverview, fetchAdminUsers } from '../services/admin';

export function useAdminOverview() {
  const { profile } = useAuthStore();
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: fetchAdminOverview,
    enabled: profile?.role === 'admin',
    staleTime: 1000 * 30,
  });
}

export function useAdminUsers() {
  const { profile } = useAuthStore();
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: fetchAdminUsers,
    enabled: profile?.role === 'admin',
    staleTime: 1000 * 30,
  });
}
