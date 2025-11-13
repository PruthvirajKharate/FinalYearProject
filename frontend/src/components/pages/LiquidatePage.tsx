import { AlertTriangle, CheckCircle } from "lucide-react";
import NeoCard from "../common/NeoCard";
import NeoButton from "../common/NeoButton";

const LiquidatePage = () => {
  const positions = [
    {
      user: "0x...a4bC",
      health: "0.98",
      debt: "$1,200",
      collateral: "$1,300 (WETH)",
    },
    {
      user: "0x...fE21",
      health: "0.85",
      debt: "$5,500",
      collateral: "$6,000 (WBTC)",
    },
    {
      user: "0x...99D0",
      health: "1.05",
      debt: "$800",
      collateral: "$950 (WETH)",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-black">Liquidations</h1>
      <NeoCard>
        <h2 className="text-3xl font-bold mb-4">
          Under-Collateralized Positions
        </h2>
        <p className="mb-6 text-gray-600">
          Find positions with a Health Factor below 1.0. You can repay their
          debt to receive their collateral at a discount.
        </p>

        <div className="overflow-x-auto border-2 border-gray-100 rounded-lg">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 border-b-2 border-gray-100">
              <tr>
                <th className="py-3 px-4 text-left font-bold">User</th>
                <th className="py-3 px-4 text-left font-bold">Health Factor</th>
                <th className="py-3 px-4 text-left font-bold">Debt (xUSD)</th>
                <th className="py-3 px-4 text-left font-bold">Collateral</th>
                <th className="py-3 px-4 text-left font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const healthNum = Number(pos.health);
                const risky = healthNum < 1;
                return (
                  <tr
                    key={pos.user}
                    className="border-b-2 shadow-sm border-gray-100 last:border-b-0"
                  >
                    <td className="py-3 px-4 font-mono">{pos.user}</td>
                    <td
                      className={`py-3 px-4 font-bold ${
                        risky ? "text-red-500" : "text-green-500"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {risky ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                        {pos.health}
                      </div>
                    </td>
                    <td className="py-3 px-4">{pos.debt}</td>
                    <td className="py-3 px-4">{pos.collateral}</td>
                    <td className="py-3 px-4">
                      {risky ? (
                        <NeoButton variant="danger" className="py-2 px-3">
                          Liquidate
                        </NeoButton>
                      ) : (
                        <span className="text-gray-400">Safe</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </NeoCard>
    </div>
  );
};

export default LiquidatePage;
