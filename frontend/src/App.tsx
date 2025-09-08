import { useWallet } from "./hooks/useWallet";

function App() {
  const { account, connect } = useWallet();

  return (
    <div className="p-4">
      {account ? (
        <p>Connected: {account}</p>
      ) : (
        <button
          onClick={connect}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
}

export default App;
