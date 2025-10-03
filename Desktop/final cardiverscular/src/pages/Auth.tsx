import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Lock, User, Stethoscope, Shield, Activity, Clock, Users, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import authBackground from '@/assets/auth-background.jpg';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeTab, setActiveTab] = useState('signin');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated, login, signup } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = login(username, password);
      if (result.success) {
        toast({
          title: "Access Granted",
          description: "Welcome to Cardiovascular Care System",
        });
        navigate('/');
      } else {
        toast({
          title: "Authentication Failed",
          description: result.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "System Error",
        description: "Please contact system administrator",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        toast({
          title: "Registration Failed",
          description: "Passwords do not match",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        toast({
          title: "Registration Failed",
          description: "Password must be at least 6 characters",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const result = signup(username, password);
      if (result.success) {
        toast({
          title: "Account Created",
          description: "Your medical professional account has been created",
        });
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setActiveTab('signin');
      } else {
        toast({
          title: "Registration Failed",
          description: result.error || "Could not create account",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "System Error",
        description: "Please contact system administrator",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const HospitalStats = () => (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="text-center p-4 bg-blue-600/80 rounded-lg border-2 border-blue-400 shadow-lg">
        <Activity className="w-6 h-6 text-white mx-auto mb-2" />
        <div className="text-xl font-bold text-white">24/7</div>
        <div className="text-sm text-blue-100 font-medium">Cardiac Care</div>
      </div>
      <div className="text-center p-4 bg-green-600/80 rounded-lg border-2 border-green-400 shadow-lg">
        <Users className="w-6 h-6 text-white mx-auto mb-2" />
        <div className="text-xl font-bold text-white">500+</div>
        <div className="text-sm text-green-100 font-medium">Patients</div>
      </div>
      <div className="text-center p-4 bg-purple-600/80 rounded-lg border-2 border-purple-400 shadow-lg">
        <Stethoscope className="w-6 h-6 text-white mx-auto mb-2" />
        <div className="text-xl font-bold text-white">50+</div>
        <div className="text-sm text-purple-100 font-medium">Specialists</div>
      </div>
      <div className="text-center p-4 bg-red-600/80 rounded-lg border-2 border-red-400 shadow-lg">
        <Clock className="w-6 h-6 text-white mx-auto mb-2" />
        <div className="text-xl font-bold text-white">99.8%</div>
        <div className="text-sm text-red-100 font-medium">Uptime</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 bg-slate-900">
      {/* Enhanced Background with Medical Theme */}
      <div className="absolute inset-0 z-0">
        <img 
          src={authBackground} 
          alt="Cardiovascular Hospital Background" 
          className="w-full h-full object-cover brightness-110 contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800/30 via-teal-700/20 to-emerald-800/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 via-slate-900/20 to-slate-900/40" />
      </div>

      {/* Animated ECG Line */}
      <div className="absolute top-0 left-0 right-0 z-5 h-3 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80">
        <div className="h-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Hospital Information */}
          <div className="text-white space-y-8 animate-fade-in">
            <div className="flex items-center gap-4 mb-2">
              <div className="relative">
                <Heart className="w-20 h-20 text-red-400 animate-pulse drop-shadow-2xl" />
                <div className="absolute inset-0 bg-red-400 rounded-full blur-xl opacity-40 animate-ping"></div>
              </div>
              <div>
                <h1 className="text-5xl font-bold drop-shadow-2xl mb-2">
                  <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                    CardioCare
                  </span>
                  <span className="text-red-400 ml-2">+</span>
                </h1>
                <p className="text-xl text-blue-100 font-semibold drop-shadow-lg">
                  Advanced Cardiovascular Management
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white drop-shadow-lg leading-tight">
                Secure Medical Access Portal
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed drop-shadow font-medium">
                Authorized access for healthcare professionals to manage cardiovascular patient care, 
                surgical schedules, and medical records with enterprise-grade security and HIPAA compliance.
              </p>
            </div>

            <HospitalStats />

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-blue-600/90 rounded-xl border-2 border-blue-400 shadow-lg">
                <Shield className="w-8 h-8 text-green-300" />
                <div>
                  <div className="font-bold text-white text-lg">HIPAA Compliant</div>
                  <div className="text-green-100 font-medium">End-to-end encrypted data protection</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-emerald-600/90 rounded-xl border-2 border-emerald-400 shadow-lg">
                <AlertCircle className="w-8 h-8 text-yellow-300" />
                <div>
                  <div className="font-bold text-white text-lg">Emergency Ready</div>
                  <div className="text-yellow-100 font-medium">24/7 critical care support</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Authentication Form */}
          <div className="animate-slide-up">
            <Card className="border-3 border-blue-400/50 shadow-2xl bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm overflow-hidden">
              {/* Header Pulse Animation */}
              <div className="relative">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-blue-500 to-emerald-500 animate-pulse"></div>
                <CardHeader className="space-y-2 pb-6 pt-8">
                  <CardTitle className="text-2xl text-center flex items-center justify-center gap-3">
                    <Stethoscope className="w-7 h-7 text-red-400" />
                    <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent font-bold text-2xl">
                      Medical Portal Access
                    </span>
                    <Shield className="w-7 h-7 text-blue-400" />
                  </CardTitle>
                  <CardDescription className="text-center text-blue-200 font-semibold text-base">
                    Restricted to authorized medical personnel
                  </CardDescription>
                </CardHeader>
              </div>

              <CardContent className="pt-4 pb-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-700/80 backdrop-blur-sm border-2 border-slate-600 p-1 rounded-xl">
                    <TabsTrigger 
                      value="signin" 
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-bold transition-all duration-300 rounded-lg font-semibold"
                    >
                      Staff Sign In
                    </TabsTrigger>
                    <TabsTrigger 
                      value="signup" 
                      className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:font-bold transition-all duration-300 rounded-lg font-semibold"
                    >
                      New Registration
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="signin" className="space-y-6 pt-6 animate-fade-in">
                    <form onSubmit={handleSignIn} className="space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="signin-username" className="text-white font-bold text-base flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-300" />
                          Medical ID / Username
                        </Label>
                        <Input
                          id="signin-username"
                          type="text"
                          placeholder="Enter your staff ID or username"
                          className="bg-slate-700/80 border-2 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 h-12 text-base font-medium"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="signin-password" className="text-white font-bold text-base flex items-center gap-2">
                          <Lock className="w-5 h-5 text-blue-300" />
                          Secure Password
                        </Label>
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="Enter your secure password"
                          className="bg-slate-700/80 border-2 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 h-12 text-base font-medium"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 text-base shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-blue-500/50 h-14"
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            <span className="font-semibold">Authenticating...</span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Access Medical Portal
                          </span>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-6 pt-6 animate-fade-in">
                    <form onSubmit={handleSignUp} className="space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="signup-username" className="text-white font-bold text-base flex items-center gap-2">
                          <User className="w-5 h-5 text-green-300" />
                          Create Medical ID
                        </Label>
                        <Input
                          id="signup-username"
                          type="text"
                          placeholder="Choose your staff username"
                          className="bg-slate-700/80 border-2 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 h-12 text-base font-medium"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="signup-password" className="text-white font-bold text-base flex items-center gap-2">
                          <Lock className="w-5 h-5 text-green-300" />
                          Set Secure Password
                        </Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Minimum 6 characters required"
                          className="bg-slate-700/80 border-2 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 h-12 text-base font-medium"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="confirm-password" className="text-white font-bold text-base flex items-center gap-2">
                          <Lock className="w-5 h-5 text-green-300" />
                          Confirm Password
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Re-enter your password"
                          className="bg-slate-700/80 border-2 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 h-12 text-base font-medium"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3.5 text-base shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-green-500/50 h-14"
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            <span className="font-semibold">Creating Account...</span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Register Medical Account
                          </span>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                {/* Security Notice */}
                <div className="mt-8 p-4 bg-amber-500/90 rounded-xl border-2 border-amber-400 shadow-lg">
                  <div className="flex items-center gap-3 text-amber-50">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-sm">SECURITY NOTICE:</div>
                      <div className="text-sm font-medium">
                        This system contains protected health information (PHI). Unauthorized access is prohibited.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}