// import { Terminal } from "lucide-react";
// import { useAppContext } from "@/context/AppContext";
// import { ACTIVITY_STATE } from "@/types/app";
// import classNames from "classnames";

// const TerminalButton = () => {
//   const { activityState, setActivityState } = useAppContext();
  
//   const isActive = activityState === ACTIVITY_STATE.TERMINAL;

//   return (
//     <button
//       onClick={() => setActivityState(ACTIVITY_STATE.TERMINAL)}
//       className={classNames(
//         "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
//         {
//           "bg-purple-600 text-white": isActive,
//           "text-gray-400 hover:bg-[#2A2A2A] hover:text-white": !isActive
//         }
//       )}
//       title="Terminal"
//     >
//       <Terminal className="w-5 h-5" />
//     </button>
//   );
// };

// export default TerminalButton;