import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Heart, Shield, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Signup additional fields
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [healthIssues, setHealthIssues] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-pulse-soft">
          <Heart className="h-12 w-12 text-primary" />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
      toast.error('Please enter a valid age');
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await signUp(email, password);
    
    if (error) {
      toast.error(error.message);
      setIsSubmitting(false);
      return;
    }
    
    // Get the newly created user to create profile
    const { data: { user: newUser } } = await supabase.auth.getUser();
    
    if (newUser) {
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: newUser.id,
        full_name: fullName.trim(),
        age: ageNum,
        health_issues: healthIssues.trim() || null,
      } as any);
      
      if (profileError) {
        console.error('Failed to create profile:', profileError);
        toast.error('Account created but failed to save profile. Please update your profile later.');
      } else {
        toast.success('Account created successfully!');
      }
    } else {
      toast.success('Account created successfully!');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10" />
        <div className="relative z-10 text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-primary mb-8 shadow-glow animate-float">
            <Heart className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl font-bold mb-4 text-foreground">
            HealthCheck <span className="text-gradient">AI</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Your intelligent health companion. Analyze symptoms, get insights, and find nearby healthcare facilities.
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 text-left p-4 rounded-lg bg-card/60 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Activity className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">Personalized Analysis</h3>
                <p className="text-sm text-muted-foreground">AI considers your health profile</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-left p-4 rounded-lg bg-card/60 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Shield className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">Your health data stays protected</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4 mx-auto shadow-glow">
              <Heart className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">Welcome</CardTitle>
            <CardDescription>Sign in to access your health dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name *</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-age">Age *</Label>
                    <Input
                      id="signup-age"
                      type="number"
                      placeholder="25"
                      min={1}
                      max={150}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-health">Existing Health Issues (optional)</Label>
                    <Textarea
                      id="signup-health"
                      placeholder="e.g., Diabetes, Hypertension, Asthma, Allergies..."
                      value={healthIssues}
                      onChange={(e) => setHealthIssues(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      This helps us provide more accurate health recommendations
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}