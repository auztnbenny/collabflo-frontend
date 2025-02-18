import { useAppContext } from "@/context/AppContext";
import useResponsive from "@/hooks/useResponsive";
import { ACTIVITY_STATE } from "@/types/app";
import DrawingEditor from "../drawing/DrawingEditor";
import EditorComponent from "../editor/EditorComponent";
import TerminalComponent from "../terminal/terminalcomponent";
import Split from "react-split";

function WorkSpace() {
  const { viewHeight } = useResponsive();
  const { activityState } = useAppContext();

  const getComponent = () => {
    switch (activityState) {
      case ACTIVITY_STATE.DRAWING:
        return <DrawingEditor />;
      case ACTIVITY_STATE.TERMINAL:
        return null; // Don't render terminal here since it's already in Split
      default:
        return <EditorComponent />;
    }
  };

  return (
    <div className="relative block bg-gradient-to-br rounded-lg">
      <div
        className="absolute left-0 top-0 w-full max-w-full flex-grow overflow-x-hidden md:static"
        style={{ height: viewHeight }}
      >
        <Split
          direction="vertical"
          sizes={activityState === ACTIVITY_STATE.TERMINAL ? [40, 60] : [85, 15]} // Adjust sizes based on state
          minSize={[200, 100]}
          gutterSize={6}
          gutterAlign="center"
          className="h-full flex flex-col"
        >
          {/* Main Component Area */}
          <div className="relative w-full h-full overflow-hidden">
            {getComponent()}
          </div>

          {/* Terminal Section */}
          <div 
            className={`relative w-full h-full border-t border-gray-600 ${
              activityState === ACTIVITY_STATE.TERMINAL ? "flex-grow" : ""
            }`}
          >
            <TerminalComponent />
          </div>
        </Split>
      </div>
    </div>
  );
}

export default WorkSpace;