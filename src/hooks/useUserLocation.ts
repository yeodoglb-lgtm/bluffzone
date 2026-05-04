// 사용자 위치 받기 훅 (PWA 웹 + 네이티브 호환)
//
// 동작:
// 1. 자동 호출하면 브라우저가 위치 권한 팝업 띄움
// 2. 사용자가 허용하면 lat/lng 반환
// 3. 거부하면 status='denied'
// 4. 시간 초과 / 미지원이면 status='error'

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported' | 'error';

export interface UserLocation {
  lat: number;
  lng: number;
}

interface State {
  status: LocationStatus;
  location: UserLocation | null;
  error: string | null;
}

export function useUserLocation(autoRequest = false): State & { request: () => void } {
  const [state, setState] = useState<State>({
    status: 'idle',
    location: null,
    error: null,
  });

  function request() {
    // 웹: navigator.geolocation
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setState({ status: 'unsupported', location: null, error: '브라우저가 위치 정보를 지원하지 않습니다' });
        return;
      }
      setState((s) => ({ ...s, status: 'loading' }));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setState({
            status: 'granted',
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            error: null,
          });
        },
        (err) => {
          // err.code: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
          setState({
            status: err.code === 1 ? 'denied' : 'error',
            location: null,
            error: err.message,
          });
        },
        {
          enableHighAccuracy: false, // 빠른 응답 우선
          timeout: 10000,
          maximumAge: 60000, // 1분 내 캐시 재사용
        },
      );
      return;
    }
    // 네이티브 (미구현)
    setState({ status: 'unsupported', location: null, error: '네이티브 위치 권한 미구현' });
  }

  useEffect(() => {
    if (autoRequest) request();
  }, [autoRequest]);

  return { ...state, request };
}

// ── 두 좌표 사이 거리 (km) ─────────────────────────────────────────────────
// Haversine 공식
export function calcDistanceKm(a: UserLocation, b: { lat: number; lng: number }): number {
  const R = 6371; // 지구 반지름 km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}
