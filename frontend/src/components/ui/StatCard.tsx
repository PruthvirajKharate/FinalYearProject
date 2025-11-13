import React from "react"; // Import React for types
import NeoCard from "../common/NeoCard";

// 1. Define the props interface
interface StatCardProps {
  title: string;
  value: React.ReactNode; // <-- CHANGED: Was string | number
  color: string; // e.g., "border-blue-500"
}

// 2. Apply the interface to the component
const StatCard: React.FC<StatCardProps> = ({ title, value, color }) => (
  <NeoCard className={`border-t-4 ${color}`} padding="p-4">
    <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
    {/* This p tag can now render text, numbers, or components */}
    <div className="text-3xl font-bold">{value}</div>
  </NeoCard>
);

export default StatCard;
