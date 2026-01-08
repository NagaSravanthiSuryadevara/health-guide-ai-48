import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FileText, Stethoscope, BookOpen, CheckCircle2 } from 'lucide-react';
import { ReportAnalysis } from '@/lib/reportAnalyzer';

interface ReportAnalysisResultProps {
  analysis: ReportAnalysis;
}

const urgencyColors = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

export function ReportAnalysisResult({ analysis }: ReportAnalysisResultProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Analysis
          </CardTitle>
          <Badge className={urgencyColors[analysis.urgencyLevel]}>
            {analysis.urgencyLevel.toUpperCase()} PRIORITY
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Type & Summary */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-2">Report Type</h4>
          <p className="font-semibold">{analysis.reportType}</p>
          <p className="text-sm text-muted-foreground mt-2">{analysis.summary}</p>
        </div>

        {/* Key Findings */}
        {analysis.keyFindings.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Key Findings
            </h4>
            <ul className="space-y-1">
              {analysis.keyFindings.map((finding, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {finding}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Possible Conditions */}
        {analysis.possibleConditions.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Possible Conditions
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.possibleConditions.map((condition, i) => (
                <Badge key={i} variant="secondary">
                  {condition}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Medical Terms Explained */}
        {analysis.medicalTermsExplained && analysis.medicalTermsExplained.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Medical Terms Explained
            </h4>
            <div className="space-y-2">
              {analysis.medicalTermsExplained.map((item, i) => (
                <div key={i} className="bg-muted/50 p-2 rounded text-sm">
                  <span className="font-medium">{item.term}:</span>{' '}
                  <span className="text-muted-foreground">{item.explanation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <strong>Disclaimer:</strong> This AI analysis is for informational purposes only and should not be considered medical advice. 
          Always consult with a qualified healthcare professional for proper diagnosis and treatment.
        </div>
      </CardContent>
    </Card>
  );
}
