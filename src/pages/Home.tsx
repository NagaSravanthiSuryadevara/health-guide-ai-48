import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Heart, LogOut, Stethoscope, MapPin, Loader2, AlertCircle, Hospital, Navigation, Upload } from 'lucide-react';
import { analyzeSymptomsFromConversation, type AnalysisResult, type ConversationMessage, type Medication } from '@/lib/symptomAnalyzer';
import { findNearbyHospitals, type Hospital as HospitalType } from '@/lib/hospitalFinder';
import { ReportUpload } from '@/components/ReportUpload';
import { ReportAnalysisResult } from '@/components/ReportAnalysisResult';
import { type ReportAnalysis } from '@/lib/reportAnalyzer';
import { SymptomHistory } from '@/components/SymptomHistory';
import { SymptomChat } from '@/components/SymptomChat';
import { supabase } from '@/integrations/supabase/client';

export default function Home() {
  const { user, signOut } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [hospitals, setHospitals] = useState<HospitalType[]>([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [reportAnalysis, setReportAnalysis] = useState<ReportAnalysis | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const historyRef = useRef<{ refresh: () => void }>(null);

  const handleConversationComplete = async (messages: ConversationMessage[]) => {
    setConversationHistory(messages);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setHospitals([]);

    try {
      const result = await analyzeSymptomsFromConversation(messages, user?.id);
      setAnalysisResult(result);
      
      // Extract initial symptoms from conversation for history
      const symptomsText = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' | ');
      
      // Save to history
      if (user) {
        const { error } = await supabase.from('symptom_history').insert({
          user_id: user.id,
          symptoms: symptomsText,
          possible_conditions: result.possibleConditions as unknown,
          recommendations: result.recommendations as unknown,
          urgency_level: result.urgencyLevel,
        } as any);
        if (error) {
          console.error('Failed to save to history:', error);
        } else {
          historyRef.current?.refresh();
        }
      }
      
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze symptoms. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFindHospitals = async () => {
    setIsLoadingHospitals(true);
    setLocationError(null);

    try {
      const result = await findNearbyHospitals();
      setHospitals(result);
      if (result.length === 0) {
        toast.info('No hospitals found nearby');
      } else {
        toast.success(`Found ${result.length} nearby hospitals`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to find hospitals';
      setLocationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingHospitals(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  const handleReportAnalysis = (analysis: ReportAnalysis) => {
    setReportAnalysis(analysis);
  };

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary/10 to-health-blue/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-tr from-health-green/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-gradient-to-t from-health-purple/5 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/70 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-11 h-11 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                HealthCheck <span className="text-gradient">AI</span>
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Your Personal Health Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
              <div className="w-2 h-2 rounded-full bg-health-green animate-pulse" />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl relative">
        {/* Symptom Input Section with Tabs */}
        <Card className="mb-8 border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/80 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />
          <CardHeader className="relative">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent via-accent to-accent/80 flex items-center justify-center shadow-lg">
                <Stethoscope className="h-7 w-7 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="font-display text-2xl sm:text-3xl">Health Assistant</CardTitle>
                <CardDescription className="text-base">Describe symptoms or upload a report for AI analysis</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <Tabs defaultValue="type" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-secondary/50 rounded-xl">
                <TabsTrigger value="type" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all">
                  <Stethoscope className="h-4 w-4" />
                  <span className="hidden sm:inline">Type Symptoms</span>
                  <span className="sm:hidden">Type</span>
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload Report</span>
                  <span className="sm:hidden">Upload</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="type" className="space-y-4">
                <SymptomChat 
                  onComplete={handleConversationComplete} 
                  isAnalyzing={isAnalyzing} 
                />
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <ReportUpload onAnalysis={handleReportAnalysis} disabled={false} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Report Analysis Result */}
        {reportAnalysis && (
          <div className="mb-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <ReportAnalysisResult analysis={reportAnalysis} />
          </div>
        )}

        {/* Symptom Analysis Result */}
        {analysisResult && (
          <Card className="mb-8 border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/80 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-health-teal/10 to-transparent rounded-full blur-3xl" />
            <CardHeader className="relative">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-health-teal-light to-health-teal/30 flex items-center justify-center shadow-lg">
                  <AlertCircle className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-display text-2xl sm:text-3xl">Analysis Results</CardTitle>
                  <CardDescription className="text-base">Based on your described symptoms</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              {/* Possible Conditions */}
              <div>
                <h3 className="font-display font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-gradient-primary rounded-full" />
                  Possible Conditions
                </h3>
                <div className="space-y-3">
                  {analysisResult.possibleConditions.map((condition, index) => (
                    <div 
                      key={index} 
                      className="p-4 rounded-xl bg-secondary/30 border border-border/50 hover:border-primary/20 transition-colors"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-foreground">{condition.name}</h4>
                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                          condition.likelihood === 'High' 
                            ? 'bg-health-orange/20 text-health-orange' 
                            : condition.likelihood === 'Medium'
                            ? 'bg-health-blue/20 text-health-blue'
                            : 'bg-health-green/20 text-health-green'
                        }`}>
                          {condition.likelihood} likelihood
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{condition.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Medications */}
              {analysisResult.medications && analysisResult.medications.length > 0 && (
                <div>
                  <h3 className="font-display font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-gradient-to-b from-health-blue to-health-purple rounded-full" />
                    Suggested Medications
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {analysisResult.medications.map((med, index) => (
                      <div key={index} className="p-4 rounded-xl bg-health-blue/5 border border-health-blue/20 hover:border-health-blue/40 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-foreground">{med.name}</h4>
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-health-blue/20 text-health-blue">
                            {med.dosage}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{med.purpose}</p>
                        <p className="text-xs text-health-orange flex items-start gap-1 bg-health-orange/5 p-2 rounded-lg">
                          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {med.warnings}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h3 className="font-display font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-gradient-to-b from-health-green to-health-teal rounded-full" />
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {analysisResult.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-3 text-muted-foreground p-3 rounded-lg hover:bg-secondary/30 transition-colors">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Urgency Level */}
              <div className={`p-5 rounded-xl border-2 ${
                analysisResult.urgencyLevel === 'Emergency'
                  ? 'bg-destructive/5 border-destructive/30'
                  : analysisResult.urgencyLevel === 'Urgent'
                  ? 'bg-health-orange/5 border-health-orange/30'
                  : 'bg-health-green/5 border-health-green/30'
              }`}>
                <p className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
                  <AlertCircle className={`h-5 w-5 ${
                    analysisResult.urgencyLevel === 'Emergency'
                      ? 'text-destructive'
                      : analysisResult.urgencyLevel === 'Urgent'
                      ? 'text-health-orange'
                      : 'text-health-green'
                  }`} />
                  Urgency Level: {analysisResult.urgencyLevel}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {analysisResult.urgencyLevel === 'Emergency' 
                    ? 'Please seek immediate medical attention!' 
                    : analysisResult.urgencyLevel === 'Urgent'
                    ? 'Consider seeing a doctor within 24-48 hours.'
                    : 'Monitor your symptoms and rest. See a doctor if symptoms worsen.'}
                </p>
              </div>

              <div className="text-xs text-muted-foreground bg-secondary/30 p-4 rounded-xl border border-border/50">
                <strong className="text-foreground">Disclaimer:</strong> This AI analysis is for informational purposes only and should not replace professional medical advice. Always consult a healthcare provider for proper diagnosis and treatment.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Symptom History */}
        <div className="mb-8">
          <SymptomHistory ref={historyRef} />
        </div>

        {/* Find Nearby Hospitals */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/80 overflow-hidden relative">
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-health-blue/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="relative">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent via-accent to-accent/80 flex items-center justify-center shadow-lg">
                <MapPin className="h-7 w-7 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="font-display text-2xl sm:text-3xl">Nearby Hospitals</CardTitle>
                <CardDescription className="text-base">Find healthcare facilities near your location</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <Button 
              onClick={handleFindHospitals} 
              disabled={isLoadingHospitals}
              className="w-full sm:w-auto bg-gradient-primary hover:opacity-90 shadow-lg shadow-primary/25 transition-all hover:scale-[1.02]"
            >
              {isLoadingHospitals ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding hospitals...
                </>
              ) : (
                <>
                  <Navigation className="mr-2 h-4 w-4" />
                  Find Nearby Hospitals
                </>
              )}
            </Button>

            {locationError && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">{locationError}</p>
            )}

            {hospitals.length > 0 && (
              <div className="space-y-3 mt-4">
                {hospitals.map((hospital, index) => (
                  <a
                    key={index}
                    href={`https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer animate-in fade-in-0 slide-in-from-left-4 group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        <Hospital className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{hospital.name}</h4>
                        <p className="text-sm text-muted-foreground truncate">{hospital.address}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">{hospital.distance}</span>
                          {hospital.phone && (
                            <span 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.location.href = `tel:${hospital.phone}`;
                              }}
                              className="text-sm text-health-blue hover:underline"
                            >
                              {hospital.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                        <Navigation className="h-5 w-5" />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
