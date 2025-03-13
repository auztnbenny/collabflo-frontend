import { useChatRoom } from "@/context/ChatContext"
import { useViews } from "@/context/ViewContext"
import { VIEWS } from "@/types/view"
import cn from "classnames"

interface ViewButtonProps {
    viewName: VIEWS
    icon: JSX.Element
}

// Custom readable titles for each view
const viewTitles: Record<VIEWS, string> = {
    [VIEWS.FILES]: "Files",
    [VIEWS.CHATS]: "Chats",
    [VIEWS.CLIENTS]: "Clients",
    [VIEWS.RUN]: "Run",
    [VIEWS.SETTINGS]: "Settings",
    [VIEWS.AI_CHAT]: "AI Assistant",
}

const ViewButton = ({ viewName, icon }: ViewButtonProps) => {
    const { activeView, setActiveView, isSidebarOpen, setIsSidebarOpen } =
        useViews()
    const { isNewMessage } = useChatRoom()

    const handleViewClick = (viewName: VIEWS) => {
        if (viewName === activeView) {
            setIsSidebarOpen(!isSidebarOpen)
        } else {
            setIsSidebarOpen(true)
            setActiveView(viewName)
        }
    }

    return (
        <button
            onClick={() => handleViewClick(viewName)}
            className={cn(
                "relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                {
                    "text-purple-500 bg-purple-500/10": viewName === activeView,
                    "text-gray-400 hover:text-white hover:bg-darkHover":
                        viewName !== activeView,
                }
            )}
            title={viewTitles[viewName]} // Now uses readable titles
        >
            {icon}
            {viewName === VIEWS.CHATS && isNewMessage && (
                <div className="absolute right-0 top-0 h-3 w-3 rounded-full bg-primary"></div>
            )}
        </button>
    )
}

export default ViewButton
