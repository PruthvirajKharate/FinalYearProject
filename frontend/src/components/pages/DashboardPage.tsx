import React from "react"; // Import React
import NeoCard from "../common/NeoCard";
import StatCard from "../ui/StatCard";
import HealthStatus from "../ui/HealthStatus";

// This component doesn't take any props, so we can just type it as a
// React Functional Component (React.FC)
const DashboardPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-black">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Health Factor"
          value={<HealthStatus factor={2.45} />} // Note: This requires StatCard's 'value' prop to be React.ReactNode
          color="border-t-green-400"
        />
        <StatCard
          title="Total Deposited (Collateral)"
          value="$1,200.00"
          color="border-t-blue-500"
        />
        <StatCard
          title="Total Borrowed (Loan)"
          value="$489.80"
          color="border-t-pink-500"
        />
        <StatCard title="Net APY" value="4.20%" color="border-t-yellow-500" />
      </div>

      <NeoCard>
        <h2 className="text-3xl font-bold mb-4">Platform Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Liquidity"
            value="$12,450,830"
            color="border-t-gray-400"
          />
          <StatCard
            title="Total Borrowed"
            value="$9,780,200"
            color="border-t-gray-400"
          />
          <StatCard
            title="Utilization Rate"
            value="78.5%"
            color="border-t-gray-400"
          />
        </div>
      </NeoCard>
    </div>
  );
};

export default DashboardPage;