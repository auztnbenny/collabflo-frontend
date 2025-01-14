import { useAppContext } from "@/context/AppContext";
import useResponsive from "@/hooks/useResponsive";
import { ACTIVITY_STATE } from "@/types/app";
import DrawingEditor from "../drawing/DrawingEditor";
import EditorComponent from "../editor/EditorComponent";
//import Section from "@/components/Section";
//import { GradientLight } from "@/components/design/Benefits";

function WorkSpace() {
  const { viewHeight } = useResponsive();
  const { activityState } = useAppContext();

  return (
   
     
        
          <div 
            className="relative block bg-gradient-to-br  rounded-lg"
          >
            <div 
              className="absolute left-0 top-0 w-full max-w-full flex-grow overflow-x-hidden md:static"
              style={{ height: viewHeight }}
            >
              {activityState === ACTIVITY_STATE.DRAWING ? (
                <DrawingEditor />
              ) : (
                <EditorComponent />
              )}
            </div>
            {/* <GradientLight /> */}
          </div>
          // 
        
     
 
  );
}

export default WorkSpace;