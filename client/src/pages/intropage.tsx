//client\src\pages\intropage.tsx
import ButtonGradient from "../assets/svg/ButtonGradient";
import Benefits from "../components/Benefits";
import Collaboration from "../components/Collaboration";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Roadmap from "../components/Roadmap";

const IntroPage: React.FC = () => {
  return (
    <>
      <div className="min-h-screen bg-[#0D1117] text-white flex flex-col items-center justify-center pt-[4.75rem] lg:pt-[5.25rem] overflow-hidden">
        {/* Header */}
        <Header />

        {/* Hero Section */}
        <Hero />

        {/* Benefits Section */}
        <Benefits />

        {/* Collaboration Section */}
        <Collaboration />

        
        {/* Roadmap Section */}
        <Roadmap />

        {/* Footer Section */}
        <Footer />
      </div>

      {/* Floating Button */}
      <ButtonGradient />
    </>
  );
};

export default IntroPage;