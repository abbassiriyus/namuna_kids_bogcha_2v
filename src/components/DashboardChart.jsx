import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'Tolovlar', value: 400 },
  { name: 'Chiqimlar', value: 300 },
  { name: 'Oyliklar', value: 300 },
  { name: 'Boshqa', value: 200 },
];

const COLORS = ['#4ade80', '#60a5fa', '#facc15', '#f87171'];

export default function DashboardChart() {
  return (
    <PieChart width={300} height={300}>
      <Pie
        data={data}
        cx={150}
        cy={150}
        outerRadius={100}
        fill="#8884d8"
        dataKey="value"
        label
      >
        {data.map((_, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
}
