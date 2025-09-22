import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import Map from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { ContourLayer } from '@deck.gl/aggregation-layers';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { ContourLayerProps } from '@deck.gl/aggregation-layers';
import type { MapViewState } from '@deck.gl/core';
import Graph from './graph';

// 🟢 Nouveaux imports MUI
import { Box, Typography, Slider } from '@mui/material';
import { Padding } from 'maplibre-gl';

const DATA_URL = '/bombing2.geojson';
const MUNI_URL = '/muni.geojson';

const INITIAL_VIEW_STATE: { main: MapViewState; minimap: MapViewState } = {
  main: { longitude: 34.34, latitude: 31.35, zoom: 10.5, maxZoom: 20, pitch: 0, bearing: -50 },
  minimap: { longitude: 34.47, latitude: 31.4, zoom: 4.5 }
};

export const BANDS: ContourLayerProps['contours'] = [
  { threshold: [1, 200], color: [226, 255, 178] },
  { threshold: [200, 700], color: [254, 204, 92] },
  { threshold: [700, 1300], color: [253, 141, 60] },
  { threshold: [1300, 2100], color: [240, 59, 32] },
  { threshold: [2100, 50000], color: [189, 0, 38] }
];

export const LINES: ContourLayerProps['contours'] = [
  { threshold: 200, color: [254, 204, 92], strokeWidth: 2 },
  { threshold: 700, color: [253, 141, 60], strokeWidth: 2 },
  { threshold: 1300, color: [240, 59, 32], strokeWidth: 2 },
  { threshold: 2100, color: [189, 0, 38], strokeWidth: 2 },
  { threshold: 5000, color: [189, 0, 38], strokeWidth: 2 }
];

export default function App({
  contours = BANDS,
  lineContours = LINES,
  mapStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
}: {
  contours?: ContourLayerProps['contours'];
  lineContours?: ContourLayerProps['contours'];
  mapStyle?: string;
}) {
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [muniData, setMuniData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [cellSize, setCellSize] = useState(110);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [hoverInfo, setHoverInfo] = useState<{ name: string | null; x: number; y: number }>({ name: null, x: 0, y: 0 });

  useEffect(() => {
    fetch(DATA_URL)
      .then(res => res.json())
      .then(json =>
        setGeoData({
          type: 'FeatureCollection',
          features: json.features.filter((f: GeoJSON.Feature) => f.geometry?.type === 'Point')
        })
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(MUNI_URL)
      .then(res => res.json())
      .then(json => setMuniData(json))
      .catch(console.error);
  }, []);

  const onViewStateChange = useCallback(
    ({ viewState: newView }: any) => {
      setViewState({
        main: newView,
        minimap: { ...viewState.minimap, longitude: newView.longitude, latitude: newView.latitude }
      });
    },
    [viewState.minimap]
  );

  if (!geoData) return <div>Chargement...</div>;

  const layers = [
    new ContourLayer<GeoJSON.Feature<GeoJSON.Point, { NUMPOINTS?: number }>>({
      id: 'contour-fill',
      data: geoData.features,
      getPosition: d => d.geometry.coordinates as [number, number],
      getWeight: d => d.properties?.NUMPOINTS ?? 1,
      pickable: true,
      aggregation: 'SUM',
      contours,
      cellSize
    }),
    new ContourLayer<GeoJSON.Feature<GeoJSON.Point, { NUMPOINTS?: number }>>({
      id: 'contour-lines',
      data: geoData.features,
      getPosition: d => d.geometry.coordinates as [number, number],
      getWeight: d => d.properties?.NUMPOINTS ?? 1,
      pickable: false,
      aggregation: 'SUM',
      contours: lineContours,
      cellSize
    }),
    muniData &&
      new GeoJsonLayer({
        id: 'muni-layer',
        data: muniData,
        pickable: true,
        stroked: true,
        filled: true,
        lineWidthMinPixels: 2,
        getLineColor: [70, 70, 70],
        getLineWidth: 6,
        getFillColor: (f: any) => {
          const geoName = (f.properties?.NAME || '').replace(/"/g, '').trim().toLowerCase();
          const hovered = (hoverInfo.name || '').replace(/"/g, '').trim().toLowerCase();
          return hovered && geoName === hovered ? [255, 255, 255, 150] : [255, 0, 0, 0];
        },
        updateTriggers: { getFillColor: [hoverInfo.name] },
        onHover: info => {
          if (info.object) {
            setHoverInfo({ name: info.object.properties.NAME, x: info.x, y: info.y });
          } else {
            setHoverInfo({ name: null, x: 0, y: 0 });
          }
        },
        worker: false
      })
  ].filter(Boolean);

  const minimapLayers = [
    new ContourLayer<GeoJSON.Feature<GeoJSON.Point, { NUMPOINTS?: number }>>({
      id: 'contour-fill-mini',
      data: geoData.features,
      getPosition: d => d.geometry.coordinates as [number, number],
      getWeight: d => d.properties?.NUMPOINTS ?? 1,
      pickable: false,
      aggregation: 'SUM',
      contours,
      cellSize
    }),
    muniData &&
      new GeoJsonLayer({
        id: 'muni-mini',
        data: muniData,
        pickable: false,
        stroked: true,
        filled: true,
        getLineColor: [70, 70, 70],
        getLineWidth: 1,
        getFillColor: [0, 0, 0, 0]
      })
  ].filter(Boolean);

  const minimapStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '2%',
    right: '2%',
    width: 'clamp(180px, 15vw, 320px)',
    height: 'clamp(180px, 15vw, 320px)',
    borderRadius: 'clamp(0px,0vw,0px)',
    overflow: 'hidden',
    boxShadow: '0 0 2vw 0.3vw rgba(0, 0, 0, 0.35)',
    zIndex: 1000
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <DeckGL layers={layers} initialViewState={viewState.main} controller={true} onViewStateChange={onViewStateChange}>
        <Map reuseMaps mapStyle={mapStyle} />
      </DeckGL>

      {/* Tooltip muni */}
      {hoverInfo.name && (
        <div
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            left: hoverInfo.x + 0,
            top: hoverInfo.y + 0,
            backgroundColor: 'rgba(47, 48, 51, 1)',
            color: 'rgba(255, 255, 255, 1)',
            padding: '8px 14px',
            borderRadius: '0px',
            fontFamily: 'Open Sans, sans-serif',
            fontWeight: 'bold',
            fontSize: '1.7vh',
            zIndex: 2000
          }}
        >
          {hoverInfo.name}
        </div>
      )}

      {/* Sidebar */}
      <div
        style={{
          position: 'absolute',
          top: '1vw',
          left: '1vw',
          bottom: '1vw',
         
          backgroundColor: 'rgba(20, 20, 20, 1)',
          padding: 'clamp(24px,0.1vw,24px)',
          borderRadius: 'clamp(0px,0vw,0px)',
          boxShadow: '0 0.2vw 0.6vw rgba(0,0,0,0.3)',
          zIndex: 1000,
          pointerEvents: 'auto',
          width: 'clamp(260px, 22vw, 480px)',
          maxHeight: 'calc(100vh - 3vw)', // hauteur max dynamique
          
          
        }}
      >
        <p
          style={{
            fontFamily: 'Open Sans, sans-serif',
            fontWeight: 'bold',
            marginTop: '0vw',
            fontSize: 'clamp(14px, 1.5vw, 24px)',
            color: 'lightgray'
          }}
        >
          Destruction in the Gaza stripe
        </p>
        <p
          style={{
            fontFamily: 'Open Sans, sans-serif',
            fontWeight: 'normal',
            fontSize: 'clamp(12px, 1.2vw, 18px)',
            color: 'lightgray'
          }}
        >
          Number of buildings destroyed per km²
        </p>
        <img src="/legende.svg" alt="Legend" style={{ display: 'block', width: '90%', height: 'auto' }} />
        <label>
          <p
            style={{
              fontFamily: 'Open Sans, sans-serif',
              fontWeight: 'normal',
              fontSize: 'clamp(12px, 1.2vw, 18px)',
              color: 'lightgray',
              marginTop: '2vw'
            }}
          >
            Change the size of the density cells
          </p>
        </label>

        {/* 🟢 Nouveau slider MUI */}
        <Box
          sx={{
            mt: 0,
            width: 'clamp(160px, 12vw, 320px)',
            mb: 2,
            p: 1,
            borderRadius: 0,
            backgroundColor: 'rgba(255,255,255,0.00)'
          }}
        >
          <Typography
            sx={{
              color: 'lightgray',
              fontWeight: 'normal',
              fontSize: 'clamp(12px, 1vw, 16px)',
              mb: 1
            }}
          >
            Meters: {cellSize}
          </Typography>

          <Slider
            min={110}
            max={300}
            step={10}
            value={cellSize}
            onChange={(_, newValue) => setCellSize(newValue as number)}
            valueLabelDisplay="auto"
            sx={{
              color: 'lightgray',
              '& .MuiSlider-valueLabel': {
                backgroundColor: 'rgba(56, 56, 56, 1)',          // 🎯 Fond rouge du tooltip
                color: '#959595ff'                                // texte blanc pour le contraste
              },
              '& .MuiSlider-thumb': {
                backgroundColor: 'rgba(189, 189, 189, 1)', // thumb rouge au repos
                '&:hover, &.Mui-focusVisible, &.Mui-active': {
                  boxShadow: '0 0 0 8px rgba(255, 255, 255, 0.16)' // halo rouge sur hover/focus/active
                }
              }
            }}
          />
        </Box>

        <p
          style={{
            fontFamily: 'Open Sans, sans-serif',
            fontWeight: 'normal',
            fontSize: 'clamp(12px, 1.2vw, 18px)',
            color: 'lightgray',
            marginTop: '0vw'
          }}
        >
          Number of buildings destroyed per municipality
        </p>
        <div style={{ marginTop: '0vw', marginBottom: '-1vw' }}>
          <Graph hoveredMuni={hoverInfo.name} onHoverMuni={name => setHoverInfo({ ...hoverInfo, name })} />
        </div>
        <p
          style={{
            fontFamily: 'Open Sans, sans-serif',
            fontWeight: 'light',
            fontSize: 'clamp(10px, 0.9vw, 14px)',
            color: 'lightgray',
            marginTop: '1vw'
          }}
        >
          Source : UNOSAT, last updated in July 2025
        </p>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          backgroundColor: 'rgba(15, 15, 15, 0.9)',
          padding: '10px',
          borderRadius: '2px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          zIndex: 1000,
          pointerEvents: 'auto'
        }}
      >
        <img src="/north.svg" alt="North Arrow" style={{ display: 'block', width: '4vh', height: 'auto' }} />
      </div>

      {/* MiniMap */}
      <div style={minimapStyle}>
        <DeckGL layers={minimapLayers} viewState={viewState.minimap} controller={false} pickingRadius={0}>
          <Map reuseMaps mapStyle={mapStyle} />
        </DeckGL>
      </div>
    </div>
  );
}

export function renderToDOM(container: HTMLDivElement) {
  createRoot(container).render(<App />);
}
