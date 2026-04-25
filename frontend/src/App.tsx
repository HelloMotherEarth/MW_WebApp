import { Navigate, Route, Routes } from "react-router-dom";

import { DeviceDetailPage } from "./pages/DeviceDetailPage";
import { DeviceOverviewPage } from "./pages/DeviceOverviewPage";

export default function App() {
  return (
    <Routes>
      <Route path="/MW" element={<DeviceOverviewPage />} />
      <Route path="/MW/device/:id" element={<DeviceDetailPage />} />
      <Route path="*" element={<Navigate to="/MW" replace />} />
    </Routes>
  );
}
