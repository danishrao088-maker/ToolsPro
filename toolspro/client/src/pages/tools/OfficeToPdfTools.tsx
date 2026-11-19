import OfficeToPdfWorkspace from "../../components/tools/OfficeToPdfWorkspace";

// Teeno tools wohi kaam karte hain, bas file ki qism alag hai.
export function WordToPdfTool() {
  return <OfficeToPdfWorkspace tool="word" />;
}

export function ExcelToPdfTool() {
  return <OfficeToPdfWorkspace tool="excel" />;
}

export function PowerpointToPdfTool() {
  return <OfficeToPdfWorkspace tool="powerpoint" />;
}