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
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">
              HealthCheck <span className="text-gradient">AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Symptom Input Section with Tabs */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="font-display text-2xl">Health Assistant</CardTitle>
                <CardDescription>Describe symptoms or upload a report</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="type" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="type" className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  <span className="hidden sm:inline">Type Symptoms</span>
                  <span className="sm:hidden">Type</span>
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
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
          <Card className="mb-8 border-0 shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-health-teal-light flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-display text-2xl">Analysis Results</CardTitle>
                  <CardDescription>Based on your described symptoms</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Possible Conditions */}
              <div>
                <h3 className="font-display font-semibold text-lg mb-3 text-foreground">Possible Conditions</h3>
                <div className="space-y-3">
                  {analysisResult.possibleConditions.map((condition, index) => (
                    <div key={index} className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-foreground">{condition.name}</h4>
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${
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
                  <h3 className="font-display font-semibold text-lg mb-3 text-foreground">Suggested Medications</h3>
                  <div className="space-y-3">
                    {analysisResult.medications.map((med, index) => (
                      <div key={index} className="p-4 rounded-lg bg-health-blue/10 border border-health-blue/30">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-foreground">{med.name}</h4>
                          <span className="text-sm font-medium px-2 py-1 rounded-full bg-health-blue/20 text-health-blue">
                            {med.dosage}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{med.purpose}</p>
                        <p className="text-xs text-health-orange flex items-start gap-1">
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
                <h3 className="font-display font-semibold text-lg mb-3 text-foreground">Recommendations</h3>
                <ul className="space-y-2">
                  {analysisResult.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-muted-foreground">
                      <span className="text-primary mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Urgency Level */}
              <div className={`p-4 rounded-lg ${
                analysisResult.urgencyLevel === 'Emergency'
                  ? 'bg-destructive/10 border border-destructive/30'
                  : analysisResult.urgencyLevel === 'Urgent'
                  ? 'bg-health-orange/10 border border-health-orange/30'
                  : 'bg-health-green/10 border border-health-green/30'
              }`}>
                <p className="font-semibold text-foreground">
                  Urgency Level: {analysisResult.urgencyLevel}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {analysisResult.urgencyLevel === 'Emergency' 
                    ? 'Please seek immediate medical attention!' 
                    : analysisResult.urgencyLevel === 'Urgent'
                    ? 'Consider seeing a doctor within 24-48 hours.'
                    : 'Monitor your symptoms and rest. See a doctor if symptoms worsen.'}
                </p>
              </div>

              <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                <strong>Disclaimer:</strong> This AI analysis is for informational purposes only and should not replace professional medical advice. Always consult a healthcare provider for proper diagnosis and treatment.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Symptom History */}
        <div className="mb-8">
          <SymptomHistory ref={historyRef} />
        </div>

        {/* Find Nearby Hospitals */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <MapPin className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="font-display text-2xl">Nearby Hospitals</CardTitle>
                <CardDescription>Find healthcare facilities near your location</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleFindHospitals} 
              disabled={isLoadingHospitals}
              variant="outline"
              className="w-full sm:w-auto"
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
              <p className="text-sm text-destructive">{locationError}</p>
            )}

            {hospitals.length > 0 && (
              <div className="space-y-3 mt-4">
                {hospitals.map((hospital, index) => (
                  <a
                    key={index}
                    href={`https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-lg bg-secondary/50 border border-border hover:bg-secondary/80 hover:border-primary/30 transition-all cursor-pointer animate-in fade-in-0 slide-in-from-left-4"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Hospital className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{hospital.name}</h4>
                        <p className="text-sm text-muted-foreground">{hospital.address}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-primary font-medium">{hospital.distance}</span>
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
                      <div className="flex-shrink-0 text-muted-foreground">
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
