import { useCall as useCallFromContext } from "../context/CallContext.jsx";

export function useCall() {
  return useCallFromContext();
}

export default function useCallHook() {
  return useCallFromContext();
}
