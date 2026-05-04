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
}

interface KakaoMapProps {
  center?: { lat: number; lng: number };
  level?: number;             // 1(가장 가까이) ~ 14
  markers?: MapMarker[];
  userLocation?: { lat: number; lng: number } | null;
  onMarkerClick?: (id: string) => void;
  height?: number;
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
  height = 400,
}: KakaoMapProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerObjs = useRef<any[]>([]);

  // 웹 전용 — 네이티브에선 placeholder
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderText}>📍 지도는 웹 또는 PWA에서 이용 가능</Text>
      </View>
    );
  }

  // 지도 초기화 (1회)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.kakao || !window.kakao.maps) {
      console.warn('[KakaoMap] SDK 로드 안 됨');
      return;
    }
    window.kakao.maps.load(() => {
      if (!mapEl.current) return;
      const opts = {
        center: new window.kakao.maps.LatLng(center.lat, center.lng),
        level,
      };
      mapInstance.current = new window.kakao.maps.Map(mapEl.current, opts);
    });
  }, []);

  // 마커 동기화
  useEffect(() => {
    if (!mapInstance.current || !window.kakao?.maps) return;
    const maps = window.kakao.maps;

    // 기존 마커 제거
    markerObjs.current.forEach(m => m.setMap(null));
    markerObjs.current = [];

    // 새 마커 추가
    markers.forEach(m => {
      const marker = new maps.Marker({
        position: new maps.LatLng(m.lat, m.lng),
        map: mapInstance.current,
        title: m.name,
      });

      // 인포윈도우 (펍 이름)
      const info = new maps.InfoWindow({
        content: `<div style="padding:6px 10px;font-size:13px;font-weight:bold;color:#0A0A0A;">${m.name}</div>`,
        removable: false,
      });

      maps.event.addListener(marker, 'mouseover', () => info.open(mapInstance.current, marker));
      maps.event.addListener(marker, 'mouseout', () => info.close());
      maps.event.addListener(marker, 'click', () => {
        if (onMarkerClick) onMarkerClick(m.id);
      });

      markerObjs.current.push(marker);
    });

    // 마커 다 보이도록 bounds 조정
    if (markers.length > 0) {
      const bounds = new maps.LatLngBounds();
      markers.forEach(m => bounds.extend(new maps.LatLng(m.lat, m.lng)));
      if (userLocation) bounds.extend(new maps.LatLng(userLocation.lat, userLocation.lng));
      mapInstance.current.setBounds(bounds);
    }
  }, [markers, userLocation, onMarkerClick]);

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
    <View style={[styles.container, { height }]}>
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
