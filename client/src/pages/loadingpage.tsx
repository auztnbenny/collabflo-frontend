import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface LoadingAnimationProps {
  roomId: string;
}

const LoadingAnimation = ({ roomId }: LoadingAnimationProps) => {
  const navigate = useNavigate();
  const [loadingSteps, setLoadingSteps] = useState([
    { text: "Initializing workspace...", completed: false },
    { text: "Setting up development environment...", completed: false },
    { text: "Configuring project settings...", completed: false },
    { text: "Loading extensions...", completed: false },
    { text: "Preparing collaborative environment...", completed: false }
  ]);

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep < loadingSteps.length) {
      const timer = setTimeout(() => {
        setLoadingSteps(prev => {
          const newSteps = [...prev];
          newSteps[currentStep] = { ...newSteps[currentStep], completed: true };
          return newSteps;
        });
        setCurrentStep(prev => prev + 1);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      // Navigate to editor page after all steps are complete
      setTimeout(() => {
        navigate(`/editor/${roomId}`);
      }, 1000);
    }
  }, [currentStep, loadingSteps.length, navigate, roomId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F17]">
      {/* Main title */}
      <h1 className="mb-10 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-500">
        Setting Up Your Project
      </h1>

      {/* Loading spinner */}
      <div className="mb-8">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      {/* Loading steps */}
      <div className="space-y-4 max-w-md w-full px-4">
        {loadingSteps.map((step, index) => (
          <div
            key={index}
            className={`transform transition-all duration-500 ${
              index <= currentStep ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`flex-shrink-0 h-5 w-5 rounded-full ${
                step.completed 
                  ? "bg-gradient-to-br from-indigo-500 to-purple-500"
                  : "bg-gray-700"
              }`}>
                {step.completed && (
                  <svg 
                    className="h-5 w-5 text-white p-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                )}
              </div>
              <span className={`text-lg ${
                step.completed ? "text-gray-200" : "text-gray-400"
              }`}>
                {step.text}
              </span>
            </div>
            {index < loadingSteps.length - 1 && (
              <div className="ml-2.5 mt-2 w-0.5 h-6 bg-gray-700"></div>
            )}
          </div>
        ))}
      </div>

      {/* Progress indication */}
      {currentStep === loadingSteps.length && (
        <div className="mt-8 text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-500 text-lg font-semibold">
          Setup Complete!
        </div>
      )}
    </div>
  );
};

export default LoadingAnimation;