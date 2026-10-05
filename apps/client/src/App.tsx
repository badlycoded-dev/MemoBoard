import { Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Whiteboard from "./pages/Whiteboard";
export default function App() {
  return <Routes><Route path="/" element={<Dashboard />} /><Route path="/board/:id" element={<Whiteboard />} /></Routes>;
}
