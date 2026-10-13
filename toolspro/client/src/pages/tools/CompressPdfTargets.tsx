import CompressPdfWorkspace from "../../components/tools/CompressPdfWorkspace";

// Size wale Compress PDF tools. Har ek wohi kaam karta hai, bas goal alag hai.
const KB = 1024;

export function CompressTo50Kb() {
  return <CompressPdfWorkspace mode={{ kind: "target", targetBytes: 50 * KB, label: "50 KB" }} />;
}

export function CompressTo100Kb() {
  return <CompressPdfWorkspace mode={{ kind: "target", targetBytes: 100 * KB, label: "100 KB" }} />;
}

export function CompressTo150Kb() {
  return <CompressPdfWorkspace mode={{ kind: "target", targetBytes: 150 * KB, label: "150 KB" }} />;
}

export function CompressTo200Kb() {
  return <CompressPdfWorkspace mode={{ kind: "target", targetBytes: 200 * KB, label: "200 KB" }} />;
}

export function CompressTo300Kb() {
  return <CompressPdfWorkspace mode={{ kind: "target", targetBytes: 300 * KB, label: "300 KB" }} />;
}

export function CompressTo500Kb() {
  return <CompressPdfWorkspace mode={{ kind: "target", targetBytes: 500 * KB, label: "500 KB" }} />;
}

export function CompressTo1Mb() {
  return <CompressPdfWorkspace mode={{ kind: "target", targetBytes: 1024 * KB, label: "1 MB" }} />;
}

export function CompressTo2Mb() {
  return <CompressPdfWorkspace mode={{ kind: "target", targetBytes: 2048 * KB, label: "2 MB" }} />;
}