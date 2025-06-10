
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Phone, Mail, Lock, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfilePageProps {
  onBack: () => void;
}

const ProfilePage = ({ onBack }: ProfilePageProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load user data from localStorage (in real app, from Supabase)
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      setName(parsed.name || '');
      setPhone(parsed.phone || '');
      setEmail(parsed.email || 'user@example.com');
    }
  }, []);

  const validateIraqiPhone = (phoneNumber: string) => {
    const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
    const iraqiPhoneRegex = /^(07\d{9}|\+9647\d{9})$/;
    return iraqiPhoneRegex.test(cleanPhone);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate phone number
    if (!validateIraqiPhone(phone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Iraqi phone number (07XXXXXXXXX or +9647XXXXXXXXX).",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      // In real implementation, update Supabase user data
      const userData = {
        name,
        email,
        phone: phone.replace(/[\s-]/g, ''),
        completedWelcome: true
      };
      localStorage.setItem('userData', JSON.stringify(userData));

      setTimeout(() => {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully."
        });
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-amber-800">Profile</h1>
            <p className="text-sm text-amber-600">Manage your account</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-24 pb-8">
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-amber-800 flex items-center">
              <User className="mr-2 h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
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
                <Label htmlFor="email" className="flex items-center text-amber-700">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
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
                  placeholder="07XXXXXXXXX or +9647XXXXXXXXX"
                  className="border-amber-200 focus:border-amber-500"
                  required
                />
                <p className="text-xs text-amber-600">Iraqi phone numbers only</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center text-amber-700">
                  <Lock className="mr-2 h-4 w-4" />
                  New Password (Optional)
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password to change"
                  className="border-amber-200 focus:border-amber-500"
                />
                <p className="text-xs text-amber-600">Leave blank to keep current password</p>
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isLoading || !name || !email || !phone}
                size="lg"
              >
                {isLoading ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProfilePage;
