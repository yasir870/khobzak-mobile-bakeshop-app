
import { useState, useEffect } from 'react';
import WelcomeScreen from './WelcomeScreen';
import CustomerDashboard from './CustomerDashboard';

interface CustomerAppProps {
  onLogout: () => void;
}

const CustomerApp = ({ onLogout }: CustomerAppProps) => {
  const [hasCompletedWelcome, setHasCompletedWelcome] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has completed welcome process
    // In real implementation, this would check Supabase user data
    const checkWelcomeStatus = () => {
      const welcomeCompleted = localStorage.getItem('welcomeCompleted');
      setHasCompletedWelcome(!!welcomeCompleted);
      setIsLoading(false);
    };

    checkWelcomeStatus();
  }, []);

  const handleWelcomeComplete = () => {
    localStorage.setItem('welcomeCompleted', 'true');
    setHasCompletedWelcome(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasCompletedWelcome) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  return <CustomerDashboard onLogout={onLogout} />;
};

export default CustomerApp;
