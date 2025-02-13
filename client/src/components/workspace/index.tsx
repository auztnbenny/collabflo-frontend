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
        return <TerminalComponent />;
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
        {/* Split component for resizable workspace and terminal */}
        <Split
          direction="vertical"
          sizes={[85, 15]} // 75% Editor, 25% Terminal
          minSize={[200, 100]} // Minimum height constraints
          gutterSize={6} // Gutter thickness
          gutterAlign="center"
          className="h-full flex flex-col"
        >
          {/* Editor or Drawing Component */}
          <div className="relative w-full h-full overflow-hidden">
            {getComponent()}
          </div>

          {/* Terminal Section with Top Border for Separation */}
          <div className="relative w-full h-full border-t border-gray-600">
            <TerminalComponent />
          </div>
        </Split>
      </div>
    </div>
  );
}

export default WorkSpace;
