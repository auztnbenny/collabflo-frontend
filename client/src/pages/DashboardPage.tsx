import { useUser, useClerk } from "@clerk/clerk-react";
//import { useAppContext } from "@/context/AppContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClipPath from "../assets/svg/ClipPath";
import Heading from "../components/Heading";
import Section from "../components/Section";
import { GradientLight } from "../components/design/Benefits";
import FormComponent from "@/components/forms/FormComponent";
import axios from "axios";
import { toast } from "react-hot-toast";

interface Project {
  roomId: string;
  participants: string[];
  createdAt: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
const DashboardPage = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  //const { currentUser } = useAppContext();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  // Function to fetch user's rooms
  const fetchUserRooms = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/room/user-rooms/${user?.fullName}`
      );
      if (response.data.success) {
        setProjects(response.data.rooms);
      } else {
        toast.error("Failed to fetch rooms");
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
      toast.error("Error loading rooms");
    } finally {
      setLoading(false);
    }
  };

  // Fetch rooms when component mounts or user changes
  useEffect(() => {
    if (user?.fullName) {
      fetchUserRooms();
    }
  }, [user?.fullName]);

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setShowModal(true);
  };

  const handleNewProject = () => {
    setSelectedProject(null);
    setShowModal(true);
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProject(null);
    fetchUserRooms();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen relative bg-transparent">
      <Section 
        id="features" 
        className="relative bg-transparent" 
        customPaddings="pt-10 pb-20"
      >
        <div className="container relative z-2">
          {/* Header */}
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

          {/* Page Title */}
          <Heading
            className="mb-10 text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-500"
            title="Your Projects"
            text="Manage and explore your active projects with ease."
          />

          {/* Projects Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full flex justify-center items-center text-white">
                <span className="loading loading-spinner loading-md"></span>
                <span className="ml-2">Loading projects...</span>
              </div>
            ) : (
              <>
                {projects.map((project) => (
                  <div
                    key={project.roomId}
                    onClick={() => handleProjectClick(project)}
                    className="block relative p-0.5 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                  >
                    <div className="relative z-2 flex flex-col items-start p-4 min-h-[10rem]">
                      <h5 className="text-lg font-bold">Room: {project.roomId}</h5>
                      <p className="text-sm text-white/80 mt-1">
                        Participants: {project.participants.join(",")}
                      </p>
                      <p className="text-xs text-white/60 mt-auto">
                        Created: {new Date(project.createdAt).toLocaleString()}
                      </p>
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
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M12 4v16m8-8H4" 
                        />
                      </svg>
                    </div>
                    <span className="mt-2 block text-sm font-medium">
                      Create New Project
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Modal for New Project */}
          {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
            <div className="relative bg-white rounded-lg p-8 w-full max-w-md shadow-xl">
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
              >
                &#x2715;
              </button>
              <FormComponent 
                userFullName={user?.fullName} 
                prefilledRoomId={selectedProject?.roomId}
              />
            </div>
          </div>
        )}

          {/* Background Elements */}
          <GradientLight />
          <ClipPath />
        </div>
      </Section>
    </div>
  );
};

export default DashboardPage;