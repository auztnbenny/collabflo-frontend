import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { FiUsers } from "react-icons/fi";
import { IoMdExit } from "react-icons/io";
import { FaCode } from "react-icons/fa";

function EditorHeader() {
  const navigate = useNavigate();
  const { currentUser, users } = useAppContext();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;
      const isVisible = prevScrollPos > currentScrollPos || currentScrollPos < 10;

      setPrevScrollPos(currentScrollPos);
      setVisible(isVisible);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [prevScrollPos]);

  const handleExit = () => {
    navigate("/dashboard");
  };

  const menuItems = {
    File: ["New File", "Open Folder", "Save", "Exit"],
    Edit: ["Undo", "Redo", "Cut", "Copy", "Paste"],
    Run: ["Start Debugging", "Run Without Debugging", "Stop"],
    Terminal: ["New Terminal", "Split Terminal", "Clear"],
    AI: ["Start Chat", "Clear Conversation", "Settings"]
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 flex items-center h-10 bg-[#1e1e1e] border-b border-[#333] z-50 transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {/* Logo Section */}
      <div className="flex items-center px-4 h-full border-r border-[#333]">
        <FaCode className="text-blue-400 text-xl" />
        <span className="ml-2 text-white text-sm font-medium">CollabFlo</span>
      </div>

      {/* Menu Items */}
      <div className="flex h-full">
        {Object.keys(menuItems).map((menu) => (
          <div key={menu} className="relative h-full">
            <button
              className={`h-full px-4 text-sm ${
                activeMenu === menu
                  ? "bg-[#2d2d2d] text-white"
                  : "text-gray-300 hover:bg-[#2d2d2d]"
              }`}
              onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
            >
              {menu}
            </button>
            {activeMenu === menu && (
              <div className="absolute top-full left-0 w-56 bg-[#1e1e1e] border border-[#333] shadow-lg">
                {menuItems[menu as keyof typeof menuItems].map((item) => (
                  <button
                    key={item}
                    className="w-full px-4 py-2 text-sm text-gray-300 text-left hover:bg-[#2d2d2d]"
                    onClick={() => setActiveMenu(null)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right Side Actions */}
      <div className="ml-auto flex items-center h-full pr-4">
        <div className="flex items-center gap-4 text-gray-300 mr-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Room: {currentUser.roomId}</span>
            <div className="flex items-center gap-1">
              <FiUsers className="text-gray-400" />
              <span className="text-sm">{users.length}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleExit}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-[#2d2d2d] rounded-md"
        >
          <IoMdExit />
          Exit
        </button>
      </div>
    </nav>
  );
}

export default EditorHeader;