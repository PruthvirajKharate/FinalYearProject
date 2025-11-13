import NeoCard from "../common/NeoCard";
import NeoButton from "../common/NeoButton";

const BorrowPage = () => {
  const myCollateral = [
    {
      asset: "WETH",
      amount: 0.5,
      value: "$1,500.00",
      apy: "2.1%",
      available: "$1,200",
    },
    {
      asset: "WBTC",
      amount: 0.0,
      value: "$0.00",
      apy: "1.8%",
      available: "$0",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-5xl font-black">Borrow & Repay</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <NeoCard>
          <h2 className="text-3xl font-bold mb-4">My Collateral</h2>
          <div className="flex flex-col gap-4 w-full">
            {myCollateral.map((item) => (
              <div
                key={item.asset}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border-2 border-gray-100"
              >
                <div>
                  <span className="text-xl font-bold">{item.asset}</span>
                  <p className="text-sm text-gray-500">APY: {item.apy}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-right">Available</p>
                  <p className="text-sm text-gray-500 text-right">
                    {item.available}
                  </p>
                </div>
                <div className="flex gap-2">
                  <NeoButton variant="primary" className="py-2 px-3">
                    Borrow
                  </NeoButton>
                  <NeoButton variant="secondary" className="py-2 px-3">
                    Repay
                  </NeoButton>
                </div>
              </div>
            ))}
          </div>
        </NeoCard>
      </div>
    </div>
  );
};

export default BorrowPage;
