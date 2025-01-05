import React from "react";
import { loading } from "../assets";

interface GeneratingProps {
  className?: string; // Optional string for custom CSS classes
}

const Generating: React.FC<GeneratingProps> = ({ className }) => {
  return (
    <div
      className={`flex items-center h-[3.5rem] px-6 bg-n-8/80 rounded-[1.7rem] ${
        className || ""
      } text-base`}
    >
      <img className="w-5 h-5 mr-4" src={loading} alt="Loading" />
      AI is generating
    </div>
  );
};

export default Generating;
