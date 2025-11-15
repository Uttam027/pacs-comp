"use client";
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Marker = {
  name: string;
  lat: number;
  lng: number;
  percentage: number;
  color: string;
  pacsAlloted: number;
  golive?: number;
  epacs?: number;
  dynamicDayEnd?: number;
};

type Props = {
  markers: Marker[];
  metric: 'golive' | 'epacs' | 'dynamicDayEnd';
};

const GeospatialMapComponent = ({ markers, metric }: Props) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map only once
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [26.9124, 74.7873], // Center of Rajasthan
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: true
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      mapRef.current = map;
    }

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        mapRef.current!.removeLayer(layer);
      }
    });

    // Add markers
    markers.forEach((marker) => {
      if (!marker) return;

      const metricValue = marker[metric] || 0;
      const radius = Math.max(8, Math.min(30, (marker.percentage / 100) * 25));

      const circleMarker = L.circleMarker([marker.lat, marker.lng], {
        radius,
        fillColor: marker.color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7
      });

      const metricLabel = metric === 'golive' ? 'Go Live' : metric === 'epacs' ? 'E-PACS' : 'Dynamic Day-End';

      circleMarker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #111;">${marker.name}</div>
          <div style="font-size: 12px; color: #666;">
            <div style="margin-bottom: 4px;">
              <strong>${metricLabel}:</strong> ${metricValue} / ${marker.pacsAlloted}
            </div>
            <div style="margin-bottom: 4px;">
              <strong>Percentage:</strong>
              <span style="color: ${marker.color}; font-weight: 600; margin-left: 4px;">
                ${marker.percentage.toFixed(1)}%
              </span>
            </div>
            ${marker.golive !== undefined ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <div style="font-size: 11px; color: #888; margin-bottom: 4px;">All Metrics:</div>
              <div style="font-size: 11px;">Go Live: ${marker.golive}</div>
              <div style="font-size: 11px;">E-PACS: ${marker.epacs}</div>
              <div style="font-size: 11px;">Day-End: ${marker.dynamicDayEnd}</div>
            </div>` : ''}
          </div>
        </div>
      `, {
        maxWidth: 250,
        className: 'custom-popup'
      });

      circleMarker.bindTooltip(marker.name, {
        permanent: false,
        direction: 'top',
        offset: [0, -10]
      });

      circleMarker.addTo(mapRef.current!);
    });

    // Cleanup
    return () => {
      // Don't destroy map, just clear markers
    };
  }, [markers, metric]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '0 0 16px 16px'
      }}
    />
  );
};

export default GeospatialMapComponent;
