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
        {/* Add Split component for vertical splitting */}
        <Split
          direction="vertical"
          sizes={[70, 30]}
          minSize={100}
          gutterSize={4}
          className="h-full flex flex-col"
        >
          {getComponent()}
          <TerminalComponent />
        </Split>
      </div>
    </div>
  );
}

export default WorkSpace;