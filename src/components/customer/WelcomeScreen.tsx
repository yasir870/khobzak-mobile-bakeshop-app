
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WelcomeScreenProps {
  onComplete: () => void;
}

const WelcomeScreen = ({ onComplete }: WelcomeScreenProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneConfirm, setPhoneConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate phone numbers match
    if (phone !== phoneConfirm) {
      toast({
        title: "Phone Numbers Don't Match",
        description: "Please ensure both phone numbers are identical.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Validate phone number format (basic)
    const phoneRegex = /^\+966[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Saudi phone number (+966XXXXXXXXX).",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      // In real implementation, save to Supabase Users table
      // For now, simulate API call
      setTimeout(() => {
        toast({
          title: "Welcome to Khobzak!",
          description: "Your profile has been created successfully."
        });
        onComplete();
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-800 mb-2">Welcome to خبزك!</h1>
          <p className="text-amber-600">Let's set up your profile to get started</p>
        </div>

        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-amber-800">Profile Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center text-amber-700">
                  <User className="mr-2 h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="border-amber-200 focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center text-amber-700">
                  <Phone className="mr-2 h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966 5XX XXX XXX"
                  className="border-amber-200 focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneConfirm" className="flex items-center text-amber-700">
                  <Phone className="mr-2 h-4 w-4" />
                  Confirm Phone Number
                </Label>
                <Input
                  id="phoneConfirm"
                  type="tel"
                  value={phoneConfirm}
                  onChange={(e) => setPhoneConfirm(e.target.value)}
                  placeholder="+966 5XX XXX XXX"
                  className="border-amber-200 focus:border-amber-500"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isLoading || !name || !phone || !phoneConfirm}
              >
                {isLoading ? 'Setting up...' : 'Complete Setup'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WelcomeScreen;
