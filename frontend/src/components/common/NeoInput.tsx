import React from "react"; // Import React for types

// 1. Define the props interface
interface NeoInputProps {
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "password" | "email"; // Be specific or just use string
  id: string; // id is required for the <label> htmlFor
  value: string | number;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}

// 2. Apply the interface to the component
const NeoInput: React.FC<NeoInputProps> = ({
  label,
  placeholder,
  type = "text",
  id,
  value,
  onChange,
}) => (
  <div className="w-full">
    <label htmlFor={id} className="block text-sm font-bold mb-2">
      {label}
    </label>
    <input
      type={type}
      id={id}
      placeholder={placeholder}
      className="w-full rounded-lg py-3 px-4 bg-white border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
      value={value}
      onChange={onChange}
    />
  </div>
);

export default NeoInput;
