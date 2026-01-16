import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Heart, LogOut, Stethoscope, MapPin, Loader2, AlertCircle, Hospital, Navigation, Upload, Sparkles } from 'lucide-react';
import { analyzeSymptomsFromConversation, type AnalysisResult, type ConversationMessage } from '@/lib/symptomAnalyzer';
import { findNearbyHospitals, type Hospital as HospitalType } from '@/lib/hospitalFinder';
import { ReportUpload } from '@/components/ReportUpload';
import { ReportAnalysisResult } from '@/components/ReportAnalysisResult';
import { type ReportAnalysis } from '@/lib/reportAnalyzer';
import { SymptomHistory } from '@/components/SymptomHistory';
import { SymptomChat } from '@/components/SymptomChat';
import { supabase } from '@/integrations/supabase/client';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 }
};

const slideInFromRight = {
  initial: { x: 50, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -50, opacity: 0 }
};

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
      
      const symptomsText = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' | ');
      
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
      {/* Animated background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary/15 to-health-blue/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.7, 0.5]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-tr from-health-green/15 to-transparent rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 20, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-40 right-1/3 w-72 h-72 bg-gradient-to-t from-health-purple/10 to-transparent rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.15, 1],
            y: [0, -20, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.header 
        className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-primary/5"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div 
              className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-xl shadow-primary/30"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <Heart className="h-6 w-6 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                HealthCheck <span className="text-gradient">AI</span>
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Your Personal Health Assistant</p>
            </div>
          </motion.div>
          <div className="flex items-center gap-4">
            <motion.div 
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/60 border border-border/50 backdrop-blur-sm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div 
                className="w-2 h-2 rounded-full bg-health-green"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all duration-300">
                <LogOut className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl relative">
        {/* Symptom Input Section with Tabs */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeInUp}
          transition={{ duration: 0.6 }}
        >
          <Card className="mb-8 border-0 shadow-2xl bg-gradient-to-br from-card via-card to-card/90 overflow-hidden relative group">
            <motion.div 
              className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-primary/10 to-health-blue/5 rounded-full blur-3xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 6, repeat: Infinity }}
            />
            <motion.div 
              className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-to-tr from-health-green/10 to-transparent rounded-full blur-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <CardHeader className="relative">
              <motion.div 
                className="flex items-center gap-4 mb-2"
                variants={fadeInUp}
              >
                <motion.div 
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent via-accent to-primary/20 flex items-center justify-center shadow-xl shadow-primary/20"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.8 }}
                >
                  <Stethoscope className="h-8 w-8 text-accent-foreground" />
                </motion.div>
                <div>
                  <CardTitle className="font-display text-2xl sm:text-3xl bg-clip-text">Health Assistant</CardTitle>
                  <CardDescription className="text-base">Describe symptoms or upload a report for AI analysis</CardDescription>
                </div>
              </motion.div>
            </CardHeader>
            <CardContent className="relative">
              <Tabs defaultValue="type" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 p-1.5 bg-secondary/60 rounded-xl backdrop-blur-sm">
                  <TabsTrigger value="type" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all duration-300">
                    <Stethoscope className="h-4 w-4" />
                    <span className="hidden sm:inline">Type Symptoms</span>
                    <span className="sm:hidden">Type</span>
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all duration-300">
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
        </motion.div>

        {/* Report Analysis Result */}
        <AnimatePresence mode="wait">
          {reportAnalysis && (
            <motion.div 
              className="mb-8"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={scaleIn}
              transition={{ duration: 0.5 }}
            >
              <ReportAnalysisResult analysis={reportAnalysis} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Symptom Analysis Result */}
        <AnimatePresence mode="wait">
          {analysisResult && (
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={scaleIn}
              transition={{ duration: 0.5 }}
            >
              <Card className="mb-8 border-0 shadow-2xl bg-gradient-to-br from-card via-card to-card/90 overflow-hidden relative">
                <motion.div 
                  className="absolute top-0 left-0 w-full h-1.5 bg-gradient-primary"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
                <motion.div 
                  className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-health-teal/15 to-transparent rounded-full blur-3xl"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 6, repeat: Infinity }}
                />
                <CardHeader className="relative">
                  <motion.div 
                    className="flex items-center gap-4 mb-2"
                    variants={fadeInUp}
                  >
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-health-teal-light to-health-teal/40 flex items-center justify-center shadow-xl"
                      initial={{ rotate: -180, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Sparkles className="h-8 w-8 text-primary" />
                    </motion.div>
                    <div>
                      <CardTitle className="font-display text-2xl sm:text-3xl">Analysis Results</CardTitle>
                      <CardDescription className="text-base">Based on your described symptoms</CardDescription>
                    </div>
                  </motion.div>
                </CardHeader>
                <CardContent className="space-y-6 relative">
                  {/* Possible Conditions */}
                  <motion.div variants={staggerContainer} initial="initial" animate="animate">
                    <h3 className="font-display font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
                      <motion.span 
                        className="w-1.5 h-6 bg-gradient-primary rounded-full"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                      Possible Conditions
                    </h3>
                    <div className="space-y-3">
                      {analysisResult.possibleConditions.map((condition, index) => (
                        <motion.div 
                          key={index} 
                          className="p-5 rounded-xl bg-secondary/40 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
                          variants={slideInFromRight}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ x: 4 }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{condition.name}</h4>
                            <motion.span 
                              className={`text-sm font-medium px-3 py-1 rounded-full ${
                                condition.likelihood === 'High' 
                                  ? 'bg-health-orange/20 text-health-orange' 
                                  : condition.likelihood === 'Medium'
                                  ? 'bg-health-blue/20 text-health-blue'
                                  : 'bg-health-green/20 text-health-green'
                              }`}
                              whileHover={{ scale: 1.05 }}
                            >
                              {condition.likelihood} likelihood
                            </motion.span>
                          </div>
                          <p className="text-sm text-muted-foreground">{condition.description}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Recommendations */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="font-display font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
                      <motion.span 
                        className="w-1.5 h-6 bg-gradient-to-b from-health-green to-health-teal rounded-full"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                      />
                      Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {analysisResult.recommendations.map((rec, index) => (
                        <motion.li 
                          key={index} 
                          className="flex items-start gap-3 text-muted-foreground p-3 rounded-xl hover:bg-secondary/40 transition-all duration-300"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.05 }}
                          whileHover={{ x: 4 }}
                        >
                          <motion.span 
                            className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                          />
                          <span>{rec}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>

                  {/* Urgency Level */}
                  <motion.div 
                    className={`p-5 rounded-xl border-2 ${
                      analysisResult.urgencyLevel === 'Emergency'
                        ? 'bg-destructive/10 border-destructive/40'
                        : analysisResult.urgencyLevel === 'Urgent'
                        ? 'bg-health-orange/10 border-health-orange/40'
                        : 'bg-health-green/10 border-health-green/40'
                    }`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    <p className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                      >
                        <AlertCircle className={`h-5 w-5 ${
                          analysisResult.urgencyLevel === 'Emergency'
                            ? 'text-destructive'
                            : analysisResult.urgencyLevel === 'Urgent'
                            ? 'text-health-orange'
                            : 'text-health-green'
                        }`} />
                      </motion.div>
                      Urgency Level: {analysisResult.urgencyLevel}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {analysisResult.urgencyLevel === 'Emergency' 
                        ? 'Please seek immediate medical attention!' 
                        : analysisResult.urgencyLevel === 'Urgent'
                        ? 'Consider seeing a doctor within 24-48 hours.'
                        : 'Monitor your symptoms and rest. See a doctor if symptoms worsen.'}
                    </p>
                  </motion.div>

                  <motion.div 
                    className="text-xs text-muted-foreground bg-secondary/40 p-4 rounded-xl border border-border/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <strong className="text-foreground">Disclaimer:</strong> This AI analysis is for informational purposes only and should not replace professional medical advice. Always consult a healthcare provider for proper diagnosis and treatment.
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Symptom History */}
        <motion.div 
          className="mb-8"
          initial="initial"
          animate="animate"
          variants={fadeInUp}
          transition={{ delay: 0.2 }}
        >
          <SymptomHistory ref={historyRef} />
        </motion.div>

        {/* Find Nearby Hospitals */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeInUp}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-card via-card to-card/90 overflow-hidden relative group">
            <motion.div 
              className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-health-blue/15 to-transparent rounded-full blur-3xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <CardHeader className="relative">
              <motion.div 
                className="flex items-center gap-4 mb-2"
                variants={fadeInUp}
              >
                <motion.div 
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent via-accent to-health-blue/20 flex items-center justify-center shadow-xl shadow-primary/20"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.8 }}
                >
                  <MapPin className="h-8 w-8 text-accent-foreground" />
                </motion.div>
                <div>
                  <CardTitle className="font-display text-2xl sm:text-3xl">Nearby Hospitals</CardTitle>
                  <CardDescription className="text-base">Find healthcare facilities near your location</CardDescription>
                </div>
              </motion.div>
            </CardHeader>
            <CardContent className="space-y-4 relative">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={handleFindHospitals} 
                  disabled={isLoadingHospitals}
                  className="w-full sm:w-auto bg-gradient-primary hover:opacity-90 shadow-xl shadow-primary/30 transition-all"
                  size="lg"
                >
                  {isLoadingHospitals ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Finding hospitals...
                    </>
                  ) : (
                    <>
                      <Navigation className="mr-2 h-5 w-5" />
                      Find Nearby Hospitals
                    </>
                  )}
                </Button>
              </motion.div>

              <AnimatePresence>
                {locationError && (
                  <motion.p 
                    className="text-sm text-destructive bg-destructive/10 p-4 rounded-xl border border-destructive/20"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {locationError}
                  </motion.p>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {hospitals.length > 0 && (
                  <motion.div 
                    className="space-y-3 mt-4"
                    initial="initial"
                    animate="animate"
                    variants={staggerContainer}
                  >
                    {hospitals.map((hospital, index) => (
                      <motion.a
                        key={index}
                        href={`https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-5 rounded-xl bg-secondary/40 border border-border/50 hover:bg-secondary/60 hover:border-primary/30 hover:shadow-xl transition-all cursor-pointer group"
                        variants={slideInFromRight}
                        whileHover={{ x: 6, scale: 1.01 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-start gap-4">
                          <motion.div 
                            className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0"
                            whileHover={{ rotate: 10 }}
                          >
                            <Hospital className="h-7 w-7 text-primary" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{hospital.name}</h4>
                            <p className="text-sm text-muted-foreground truncate">{hospital.address}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm text-primary font-semibold bg-primary/10 px-3 py-1 rounded-full">{hospital.distance}</span>
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
                          <motion.div 
                            className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <Navigation className="h-5 w-5" />
                          </motion.div>
                        </div>
                      </motion.a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
