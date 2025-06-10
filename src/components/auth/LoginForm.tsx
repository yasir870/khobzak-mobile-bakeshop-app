
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoginFormProps {
  role: 'customer' | 'driver';
  onAuthSuccess: (role: 'customer' | 'driver') => void;
  onBack: () => void;
}

const LoginForm = ({ role, onAuthSuccess, onBack }: LoginFormProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // For now, simulate authentication
      // In real implementation, this would use Supabase auth
      if (role === 'driver') {
        // Simulate driver verification against authorized list
        const authorizedDrivers = ['driver@khobzak.com', '+966501234567'];
        const identifier = email || phone;
        
        if (!authorizedDrivers.includes(identifier)) {
          toast({
            title: "Access Denied",
            description: "You are not authorized as a driver. Please contact administration.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }

      // Simulate successful login
      setTimeout(() => {
        toast({
          title: "Login Successful",
          description: `Welcome ${role}!`
        });
        onAuthSuccess(role);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Please check your credentials and try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          onClick={onBack}
          variant="ghost"
          className="mb-4 text-amber-700 hover:text-amber-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Role Selection
        </Button>

        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-amber-800">
              {role === 'customer' ? 'Customer' : 'Driver'} {isLogin ? 'Login' : 'Register'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center text-amber-700">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="border-amber-200 focus:border-amber-500"
                />
              </div>

              {role === 'driver' && (
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center text-amber-700">
                    <Phone className="mr-2 h-4 w-4" />
                    Phone Number (Alternative)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+966 5XX XXX XXX"
                    className="border-amber-200 focus:border-amber-500"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-amber-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="border-amber-200 focus:border-amber-500"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isLoading || (!email && !phone)}
              >
                {isLoading ? 'Authenticating...' : `${isLogin ? 'Login' : 'Register'} as ${role}`}
              </Button>

              {role === 'customer' && (
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-amber-600 hover:text-amber-700"
                  >
                    {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;
