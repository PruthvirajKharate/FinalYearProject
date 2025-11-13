import React from "react"; // Import React for types

// 1. Define the props interface
interface HealthStatusProps {
  // Accept number or string, as it will be coerced
  factor: number | string;
}

// 2. Apply the interface to the component
const HealthStatus: React.FC<HealthStatusProps> = ({ factor }) => {
  const f = Number(factor); // Convert prop to number
  let color = "text-green-600";
  let text = "Safe";

  if (f < 1.5) {
    color = "text-yellow-500";
    text = "Risky";
  }
  if (f < 1.1) {
    color = "text-red-500";
    text = "Liquidation risk";
  }

  return (
    <div className={`flex items-center gap-2 ${color}`}>
      <span className="font-bold text-3xl">{f.toFixed(2)}</span>
      <span className="text-sm font-medium">({text})</span>
    </div>
  );
};

export default HealthStatus;
