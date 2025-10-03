import { DashboardLayout } from "@/components/DashboardLayout";
import Dashboard from "./Dashboard";

const Index = () => {
  return (
    <DashboardLayout 
      title="Dashboard Overview" 
      subtitle="Surgery tracking system central hub"
    >
      <Dashboard />
    </DashboardLayout>
  );
};

export default Index;
