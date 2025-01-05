import React from "react";
import SectionSvg from "../assets/svg/SectionSvg";

interface SectionProps {
  className?: string; // Optional string for additional CSS classes
  id?: string; // Optional string for HTML id attribute
  crosses?: boolean; // Optional boolean to determine if crosses are shown
  crossesOffset?: string | number; // Optional string or number for offset
  customPaddings?: string | boolean; // Optional string for custom paddings
  children: React.ReactNode; // Children are required for the component
}

const Section: React.FC<SectionProps> = ({
  className,
  id,
  crosses,
  crossesOffset,
  customPaddings,
  children,
}) => {
  return (
    <div
      id={id}
      className={`
      relative 
      ${
        customPaddings ||
        `py-10 lg:py-16 xl:py-20 ${crosses ? "lg:py-32 xl:py-40" : ""}`
      } 
      ${className || ""}`}
    >
      {children}

      {/* Vertical lines */}
      <div className="hidden absolute top-0 left-5 w-0.25 h-full bg-stroke-1 pointer-events-none md:block lg:left-7.5 xl:left-10" />
      <div className="hidden absolute top-0 right-5 w-0.25 h-full bg-stroke-1 pointer-events-none md:block lg:right-7.5 xl:right-10" />

      {crosses && (
        <>
          {/* Horizontal line */}
          <div
            className={`hidden absolute top-0 left-7.5 right-7.5 h-0.25 bg-stroke-1 ${
              crossesOffset || ""
            } pointer-events-none lg:block xl:left-10 right-10`}
          />
          {/* Section SVG */}
          <SectionSvg crossesOffset={crossesOffset} />
        </>
      )}
    </div>
  );
};

export default Section;
