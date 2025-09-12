import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

interface DataPoint {
  NAME: string;
  NUMPOINTS: number;
}

const data: DataPoint[] = [
  { NAME: 'Az Zawayda', NUMPOINTS: 934 },
  { NAME: 'Al Maghazi Camp', NUMPOINTS: 2201 },
  { NAME: 'Deir al Balah', NUMPOINTS: 3491 },
  { NAME: 'Al Musaddar', NUMPOINTS: 404 },
  { NAME: 'Khan Yunis', NUMPOINTS: 28799 },
  { NAME: 'Al Qaraya al Badawiya', NUMPOINTS: 716 },
  { NAME: 'Beit Hanoun', NUMPOINTS: 6270 },
  { NAME: 'Jabalya', NUMPOINTS: 18330 },
  { NAME: 'Gaza', NUMPOINTS: 41103 },
  { NAME: 'Al Zahra', NUMPOINTS: 139 },
  { NAME: 'Al Mughraqa', NUMPOINTS: 2227 },
  { NAME: 'Beit Lahiya', NUMPOINTS: 13363 },
  { NAME: "Khuza'a", NUMPOINTS: 2317 },
  { NAME: 'Al Fukhkhari', NUMPOINTS: 1363 },
  { NAME: 'An Naser', NUMPOINTS: 2435 },
  { NAME: 'Shokat as Sufi', NUMPOINTS: 3575 },
  { NAME: 'Wadi as Salqa', NUMPOINTS: 1575 },
  { NAME: 'Al Qarara', NUMPOINTS: 5300 },
  { NAME: 'Rafah', NUMPOINTS: 27175 },
  { NAME: 'Al Mughraqa', NUMPOINTS: 1560 },
  { NAME: 'An Nuseirat Camp', NUMPOINTS: 4552 },
  { NAME: 'Al Bureij Camp', NUMPOINTS: 4060 },
];

const sortedData = [...data].sort((a, b) => b.NUMPOINTS - a.NUMPOINTS);

interface GraphProps {
  onHoverMuni?: (name: string | null) => void;
  hoveredMuni: string | null;
}

export default function Graph({ onHoverMuni, hoveredMuni }: GraphProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={sortedData}
        layout="vertical"
        margin={{ top: 20, right: 30, left: -10, bottom: 10 }}
        onMouseMove={(e: any) => {
          if (e && e.activeLabel) {
            const index = sortedData.findIndex(d => d.NAME === e.activeLabel);
            setActiveIndex(index);
            onHoverMuni?.(e.activeLabel);
          }
        }}
        onMouseLeave={() => {
          setActiveIndex(null);
          onHoverMuni?.(null);
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2dff" />
        <XAxis type="number" tick={{ fill: '#ddd' }} />
        <YAxis dataKey="NAME" type="category" width={150} tick={{ fill: '#ddd' }} interval={1} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div style={{ backgroundColor: '#222', padding: '8px', borderRadius: '4px', color: '#fff' }}>
                  <div><b>{label}</b></div>
                  <div>Number of buildings destroyed: {payload[0].value}</div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="NUMPOINTS"
          radius={[0, 5, 5, 0]}
          animationDuration={3000}
        >
          {sortedData.map((entry, index) => {
            const isHovered = activeIndex === index || hoveredMuni?.toLowerCase() === entry.NAME.toLowerCase();
            return (
              <Cell
                key={`cell-${entry.NAME}-${index}`}
                fill={isHovered ? 'rgba(232, 171, 171, 0.87)' : 'rgba(184, 56, 30, 0.7)'}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
