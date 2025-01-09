import { useAppContext } from "@/context/AppContext";
import useResponsive from "@/hooks/useResponsive";
import { ACTIVITY_STATE } from "@/types/app";
import DrawingEditor from "../drawing/DrawingEditor";
import EditorComponent from "../editor/EditorComponent";
import Section from "@/components/Section";
import { GradientLight } from "@/components/design/Benefits";

function WorkSpace() {
  const { viewHeight } = useResponsive();
  const { activityState } = useAppContext();

  return (
    <div className="min-h-screen relative bg-transparent">
      <Section 
        id="workspace" 
        className="relative bg-transparent" 
        customPaddings="pt-0 pb-0"
      >
        <div className="container relative z-2 p-0">
          <div 
            className="relative block bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 rounded-lg"
          >
            <div 
              className="relative w-full overflow-x-hidden rounded-lg bg-[#1D1E2C]"
              style={{ height: viewHeight }}
            >
              {activityState === ACTIVITY_STATE.DRAWING ? (
                <DrawingEditor />
              ) : (
                <EditorComponent />
              )}
            </div>
          </div>
          <GradientLight />
        </div>
      </Section>
    </div>
  );
}

export default WorkSpace;