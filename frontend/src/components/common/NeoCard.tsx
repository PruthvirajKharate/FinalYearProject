import React from "react"; // Import React for types

// 1. Define the props interface
interface NeoCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

// 2. Apply the interface to the component
const NeoCard: React.FC<NeoCardProps> = ({
  children,
  className = "",
  padding = "p-6",
}) => (
  <div
    className={`rounded-lg backdrop-blur-2xl bg-white/25 shadow-[0_10px_20px_-5px_rgb(0_0_0_/_0.1),inset_0px_2px_3px_#ffffff] w-full overflow-auto ${padding} ${className}`}
  >
    {children}
  </div>
);

export default NeoCard;
