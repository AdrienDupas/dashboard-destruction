import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import Map from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { ContourLayer } from '@deck.gl/aggregation-layers';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { ContourLayerProps } from '@deck.gl/aggregation-layers';
import type { MapViewState } from '@deck.gl/core';
import Graph from './graph';

const DATA_URL = '/bombing.geojson';
const MUNI_URL = '/muni.geojson';

const INITIAL_VIEW_STATE: { main: MapViewState; minimap: MapViewState } = {
  main: { longitude: 34.34, latitude: 31.35, zoom: 10.5, maxZoom: 20, pitch: 0, bearing: -50 },
  minimap: { longitude: 34.47, latitude: 31.4, zoom: 5 }
};

export const BANDS: ContourLayerProps['contours'] = [
  { threshold: [1, 3], color: [255, 255, 178] },
  { threshold: [3, 7], color: [254, 204, 92] },
  { threshold: [7, 13], color: [253, 141, 60] },
  { threshold: [13, 21], color: [240, 59, 32] },
  { threshold: [21, 5000], color: [189, 0, 38] }
];

export const LINES: ContourLayerProps['contours'] = [
  { threshold: 3, color: [254, 204, 92], strokeWidth: 2 },
  { threshold: 7, color: [253, 141, 60], strokeWidth: 2 },
  { threshold: 13, color: [240, 59, 32], strokeWidth: 2 },
  { threshold: 21, color: [189, 0, 38], strokeWidth: 2 },
  { threshold: 50, color: [189, 0, 38], strokeWidth: 2 }
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
  const [hoveredMuni, setHoveredMuni] = useState<string | null>(null);

  useEffect(() => {
    fetch(DATA_URL)
      .then(res => res.json())
      .then(json => setGeoData({
        type: 'FeatureCollection',
        features: json.features.filter((f: GeoJSON.Feature) => f.geometry?.type === 'Point')
      }))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(MUNI_URL)
      .then(res => res.json())
      .then(json => setMuniData(json))
      .catch(console.error);
  }, []);

  const onViewStateChange = useCallback(({ viewState: newView }: any) => {
    setViewState({
      main: newView,
      minimap: { ...viewState.minimap, longitude: newView.longitude, latitude: newView.latitude }
    });
  }, [viewState.minimap]);

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
    muniData && new GeoJsonLayer({
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
        const hovered = (hoveredMuni || '').replace(/"/g, '').trim().toLowerCase();
        return hovered && geoName === hovered ? [255, 255, 255, 150] : [255, 0, 0, 0];
      },
      updateTriggers: { getFillColor: [hoveredMuni] },
      onHover: info => setHoveredMuni(info?.object?.properties?.NAME || null),
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
    muniData && new GeoJsonLayer({
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
    width: '15vw',
    height: '15vw',
    maxWidth: '20vw',
    maxHeight: '20vw',
    borderRadius: '3vw',
    overflow: 'hidden',
    boxShadow: '0 0 1vw 0.2vw rgba(0,0,0,0.15)',
    zIndex: 1000
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <DeckGL
        layers={layers}
        initialViewState={viewState.main}
        controller={true}
        onViewStateChange={onViewStateChange}
      >
        <Map reuseMaps mapStyle={mapStyle} />
      </DeckGL>

      {/* Sidebar */}
      <div style={{
        position: 'absolute',
        top: '1vw',
        left: '1vw',
        backgroundColor: 'rgba(15, 15, 15, 0.85)',
        padding: '1vw',
        borderRadius: '2vw',
        boxShadow: '0 0.2vw 0.6vw rgba(0,0,0,0.3)',
        zIndex: 1000,
        pointerEvents: 'auto',
        width: '22vw'
      }}>
        <p style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 'bold', fontSize: 'clamp(1vw, 2vw, 1.5vw)', color: 'lightgray'}}>
          Destruction in Gaza stripe
        </p>
        <p style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 'normal', fontSize: 'clamp(1vw, 1.5vw, 1.2vw)', color: 'lightgray' }}>
          Number of buildings destroyed per km²
        </p>
        <img src="/legende.svg" alt="Legend" style={{ display: "block", width: "90%", height: "auto" }} />
        <label>
          <p style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 'normal', fontSize: 'clamp(1vw, 1.5vw, 1.2vw)', color: 'lightgray', marginTop: '3vw'}}>
            Changing the size of the density cells
          </p>
          <span style={{ color: 'lightgray', fontWeight: 'normal', marginTop: '0', fontSize: 'clamp(1vw, 1.5vw, 1vw)'}}>Meters: {cellSize}</span>
          <input
            type="range"
            min={110}
            max={300}
            step={10}
            value={cellSize}
            onChange={e => setCellSize(Number(e.target.value))}
            style={{
              width: '15vw',
              marginTop: '0vw',
              marginLeft: '0.5vw',
              marginBottom: '2.5vw',
              WebkitAppearance: 'none',
              height: '0.8vw',
              borderRadius: '0.5vw',
              background: 'rgba(255, 255, 255, 0.3)',
              outline: 'none',
              cursor: 'pointer',
            }}
            className="custom-slider"
          />
        </label>
        <p style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 'normal', fontSize: 'clamp(1vw, 1.5vw, 1.2vw)', color: 'lightgray', marginTop: '2vw'}}>
          Number of buildings destroyed per municipality
        </p>
        <div style={{ marginTop: '0vw', marginBottom: "-1vw" }}>
          <Graph hoveredMuni={hoveredMuni} onHoverMuni={setHoveredMuni} />
        </div>
        <p style={{ fontFamily: 'Open Sans, sans-serif', fontWeight: 'light', fontSize: 'clamp(0.8vw, 1vw, 1vw)', color: 'lightgray' , marginTop: '2vw'}}>
          Source : UNOSAT
        </p>
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
