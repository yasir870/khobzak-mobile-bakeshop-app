
import CustomerDashboard from './CustomerDashboard';

interface CustomerAppProps {
  onLogout: () => void;
}

const CustomerApp = ({ onLogout }: CustomerAppProps) => {
  return <CustomerDashboard onLogout={onLogout} />;
};

export default CustomerApp;
