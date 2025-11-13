import NeoCard from "../common/NeoCard";
import NeoInput from "../common/NeoInput";
import NeoButton from "../common/NeoButton";
import StatCard from "../ui/StatCard";

const InvestPage = () => {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-black">Invest (Lending Pool)</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <NeoCard>
          <h2 className="text-3xl font-bold mb-4">xUSD Pool Stats</h2>
          <div className="flex flex-col gap-4">
            <StatCard
              title="Current APY"
              value="3.85%"
              color="border-t-green-400"
            />
            <StatCard
              title="Total Supplied"
              value="$12,450,830"
              color="border-t-blue-400"
            />
            <StatCard
              title="Utilization"
              value="78.5%"
              color="border-t-yellow-400"
            />
          </div>
        </NeoCard>

        <NeoCard>
          <h2 className="text-3xl font-bold mb-4">Manage Your Position</h2>

          <div className="mb-6">
            <h3 className="text-xl font-bold">Your Deposit</h3>
            <p className="text-4xl font-black text-blue-600">$5,000.00</p>
            <p className="text-sm text-gray-500">Earnings: +$120.50</p>
          </div>

          <div className="flex flex-col gap-4">
            <NeoInput
              label="Amount to Deposit"
              id="deposit-amount"
              placeholder="1000.00"
            />
            <NeoButton variant="primary" fullWidth>
              Deposit xUSD
            </NeoButton>
          </div>

          <hr className="border-t-2 border-black my-6" />

          <div className="flex flex-col gap-4">
            <NeoInput
              label="Amount to Withdraw"
              id="withdraw-amount"
              placeholder="500.00"
            />
            <NeoButton variant="secondary" fullWidth>
              Withdraw
            </NeoButton>
          </div>
        </NeoCard>
      </div>
    </div>
  );
};

export default InvestPage;
