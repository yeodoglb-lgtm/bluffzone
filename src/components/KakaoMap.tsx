// 카카오 지도 풀 임베드 컴포넌트 (web 전용)
// public/index.html 에 SDK 로드 + autoload=false 설정 → 여기서 kakao.maps.load() 호출

import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, fontSize } from '../theme';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  /** 라벨 보조 정보 (예: "10k~50k") */
  subtitle?: string;
  /** 선택 상태 (큰 핀 + 강조) */
  selected?: boolean;
}

interface KakaoMapProps {
  center?: { lat: number; lng: number };
  level?: number;             // 1(가장 가까이) ~ 14
  markers?: MapMarker[];
  userLocation?: { lat: number; lng: number } | null;
  onMarkerClick?: (id: string) => void;
  height?: number;
  /** 변경될 때마다 지도가 해당 좌표로 부드럽게 이동 (panTo) */
  panTarget?: { lat: number; lng: number; ts: number } | null;
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMap({
  center = { lat: 37.5665, lng: 126.9780 }, // 서울 시청 기본
  level = 7,
  markers = [],
  userLocation = null,
  onMarkerClick,
  height,
  panTarget = null,
}: KakaoMapProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerObjs = useRef<any[]>([]);
  const didFitBounds = useRef(false);

  // 웹 전용 — 네이티브에선 placeholder
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.placeholder, height ? { height } : { flex: 1 }]}>
        <Text style={styles.placeholderText}>📍 지도는 웹 또는 PWA에서 이용 가능</Text>
      </View>
    );
  }

  // SDK 동적 로드 — index.html에서 제거하고 컴포넌트 마운트 시점에만 다운로드
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.kakao?.maps) return; // 이미 로드됨
    // 중복 로드 방지: 기존 script 태그 체크
    const existing = document.querySelector('script[src*="dapi.kakao.com/v2/maps/sdk.js"]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=1c42d577c0b7dc9f62da99bea9dc57f5&autoload=false&libraries=clusterer';
    script.async = true;
    script.onerror = () => console.warn('[KakaoMap] SDK 로드 실패');
    document.head.appendChild(script);
  }, []);

  // 지도 초기화 — SDK 로드 대기 후 실행
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let pollCount = 0;
    const maxPolls = 100; // 10초 (100ms × 100) — 동적 로드라 시간 더 줌

    function tryInit() {
      if (cancelled) return;
      // SDK 로드 대기
      if (!window.kakao || !window.kakao.maps) {
        if (pollCount++ < maxPolls) {
          setTimeout(tryInit, 100);
        } else {
          console.warn('[KakaoMap] SDK 로드 시간 초과 (10초)');
        }
        return;
      }
      // autoload=false 라서 명시적 load 호출
      window.kakao.maps.load(() => {
        if (cancelled || !mapEl.current) return;
        try {
          const opts = {
            center: new window.kakao.maps.LatLng(center.lat, center.lng),
            level,
          };
          mapInstance.current = new window.kakao.maps.Map(mapEl.current, opts);
          console.log('[KakaoMap] 초기화 완료');
        } catch (e) {
          console.error('[KakaoMap] 초기화 실패:', e);
        }
      });
    }

    tryInit();
    return () => { cancelled = true; };
  }, []);

  // 마커 동기화 — mapInstance가 늦게 준비될 수 있어 폴링
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    let pollCount = 0;
    function tryAddMarkers() {
      if (cancelled) return;
      if (!mapInstance.current || !window.kakao?.maps) {
        if (pollCount++ < 50) setTimeout(tryAddMarkers, 100);
        return;
      }
      addMarkers();
    }
    tryAddMarkers();
    return () => { cancelled = true; };

    function addMarkers() {
    const maps = window.kakao.maps;

    // 기존 마커 제거
    markerObjs.current.forEach(m => m.setMap(null));
    markerObjs.current = [];

    // 핀 + 항상 표시되는 라벨 형태의 CustomOverlay 사용
    // (기본 InfoWindow는 hover/click 필요해 모바일에서 가려지는 문제)
    markers.forEach(m => {
      const isSelected = !!m.selected;

      // 핀 + 말풍선 (꼬리 달린 라벨) — 참고 사이트(러너러너/카우보이) 스타일
      const labelHtml = `
        <div class="bz-pin ${isSelected ? 'bz-pin-selected' : ''}" data-id="${m.id}">
          <div class="bz-pin-bubble">
            <span class="bz-pin-icon">♠</span>
            <span class="bz-pin-name">${m.name}</span>
            ${m.subtitle ? `<span class="bz-pin-sub">${m.subtitle}</span>` : ''}
          </div>
          <div class="bz-pin-tail"></div>
        </div>
      `;

      const overlay = new maps.CustomOverlay({
        position: new maps.LatLng(m.lat, m.lng),
        content: labelHtml,
        yAnchor: 1,
      });
      overlay.setMap(mapInstance.current);
      markerObjs.current.push(overlay);
    });

    // CustomOverlay 클릭 핸들러는 DOM 이벤트로 위임
    // (마커 클릭 → onMarkerClick 호출)
    if (onMarkerClick) {
      const handler = (e: any) => {
        const target = e.target as HTMLElement;
        const wrap = target.closest?.('.bz-pin') as HTMLElement | null;
        if (wrap?.dataset.id) onMarkerClick(wrap.dataset.id);
      };
      const mapEl2 = mapEl.current;
      if (mapEl2) {
        mapEl2.addEventListener('click', handler, true);
        markerObjs.current.push({ setMap: () => mapEl2.removeEventListener('click', handler, true) });
      }
    }

    // 마커 다 보이도록 bounds 조정 — 최초 1회, 마커 2개 이상일 때만
    // (1개일 땐 setCenter로 충분, userLocation 변할 때마다 흔들리지 않게)
    if (!didFitBounds.current && markers.length >= 2) {
      const bounds = new maps.LatLngBounds();
      markers.forEach(m => bounds.extend(new maps.LatLng(m.lat, m.lng)));
      mapInstance.current.setBounds(bounds);
      didFitBounds.current = true;
    } else if (!didFitBounds.current && markers.length === 1) {
      // 마커 1개면 그 좌표로 센터
      mapInstance.current.setCenter(new maps.LatLng(markers[0].lat, markers[0].lng));
      didFitBounds.current = true;
    }
    } // end addMarkers
  }, [markers, onMarkerClick]);

  // panTarget이 변하면 지도 이동 (relayout 후 setCenter — 중앙 정확히 맞추기)
  useEffect(() => {
    if (!panTarget || !mapInstance.current || !window.kakao?.maps) return;
    const map = mapInstance.current;
    const ll = new window.kakao.maps.LatLng(panTarget.lat, panTarget.lng);
    try {
      // 컨테이너 크기 변경 감지 (레이아웃 후 첫 호출 대비)
      map.relayout();
    } catch {}
    // setCenter는 즉시 정확히 중앙, panTo는 부드럽지만 transition 중 측정 오차 있음
    try {
      map.setCenter(ll);
    } catch {}
  }, [panTarget?.ts]);

  // 사용자 위치 마커 (별도 색상)
  useEffect(() => {
    if (!mapInstance.current || !userLocation || !window.kakao?.maps) return;
    const maps = window.kakao.maps;
    // 빨간 원으로 표시
    const userMarker = new maps.Circle({
      center: new maps.LatLng(userLocation.lat, userLocation.lng),
      radius: 50, // 50m 원
      strokeWeight: 2,
      strokeColor: '#FF6B35',
      strokeOpacity: 0.8,
      fillColor: '#FF6B35',
      fillOpacity: 0.4,
    });
    userMarker.setMap(mapInstance.current);
    return () => userMarker.setMap(null);
  }, [userLocation]);

  return (
    <View style={[styles.container, height ? { height } : { flex: 1 }]}>
      {/* @ts-ignore — RN에서 div 직접 사용 (web only) */}
      <div ref={mapEl} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  placeholderText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
