import { useUser, useClerk } from "@clerk/clerk-react";
import { useAppContext } from "@/context/AppContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ClipPath from "../assets/svg/ClipPath";
import Heading from "../components/Heading";
import Section from "../components/Section";
import { GradientLight } from "../components/design/Benefits";
import FormComponent from "@/components/forms/FormComponent"; // Import FormComponent

interface Project {
  id: string | null;
  name: string | null;
  lastEdited: string;
}

const DashboardPage = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false); // State to control popup visibility

  const [projects] = useState<Project[]>([
    {
      id: currentUser.roomId || "No room created",
      name: currentUser.username || " ",
      lastEdited: new Date().toLocaleString(),
    },
  ]);

  const handleNewProject = () => {
    setShowModal(true); // Show the modal
  };

  const handleCloseModal = () => {
    setShowModal(false); // Hide the modal
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen relative bg-transparent">
      <Section id="features" className="relative bg-transparent" customPaddings="pt-10 pb-20">
        <div className="container relative z-2">
          <header className="mb-10 bg-clip-text text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center border-b-[3px] border-gradient-to-br from-indigo-500 to-purple-500">
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <div className="relative">
                <div
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-4 cursor-pointer"
                >
                  <span className="text-gray-300">{user?.fullName}</span>
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                    {user?.firstName?.[0] || "U"}
                  </div>
                </div>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <button
                      onClick={handleSignOut}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <Heading
            className="mb-10 text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-500"
            title="Your Projects"
            text="Manage and explore your active projects with ease."
          />

          {/* Projects Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <div
                key={index}
                onClick={() => navigate('/editor/${project.id}')}
                className="block relative p-0.5 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              >
                <div className="relative z-2 flex flex-col items-start p-4 min-h-[10rem]">
                  <h5 className="text-lg font-bold">{project.name}</h5>
                  <p className="text-sm text-white/80 mt-1">Room ID: {project.id}</p>
                  <p className="text-xs text-white/60 mt-auto">Last edited: {project.lastEdited}</p>
                </div>
              </div>
            ))}

            {/* Add New Project Button */}
            <div
              onClick={handleNewProject}
              className="block relative p-0.5 bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-40 w-40"
            >
              <div className="text-center">
                <div className="h-12 w-12 mx-auto rounded-full bg-white flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-indigo-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="mt-2 block text-sm font-medium">Create New Project</span>
              </div>
            </div>
          </div>

          {/* Popup Modal */}
          {showModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
              <div className="relative bg-white rounded-lg p-8 w-full max-w-md shadow-xl">
                {/* Close Button */}
                <button
                  onClick={handleCloseModal}
                  className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
                >
                  &#x2715; {/* Close (X) Icon */}
                </button>

                {/* Form Component */}
                <FormComponent />
              </div>
            </div>
          )}

          <GradientLight />
          <ClipPath />
        </div>
      </Section>
    </div>
  );
};

export default DashboardPage;