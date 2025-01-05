import React from "react";


interface CompanyLogosProps {
  className?: string; // Optional string for custom CSS classes
}

const CompanyLogos: React.FC<CompanyLogosProps> = ({ className }) => {
  return (
    <div className={className}>
      <h5 className="tagline mb-6 text-center text-n-1/50">
      Empowering developers to create seamless code at Collabflo.
      </h5>
      {/* <ul className="flex">
        {companyLogos.map((logo, index) => (
          <li
            className="flex items-center justify-center flex-1 h-[8.5rem]"
            key={index}
          >
            <img src={logo} width={134} height={28} alt={`Logo ${index + 1}`} />
          </li>
        ))}
      </ul> */}
    </div>
  );
};

export default CompanyLogos;
