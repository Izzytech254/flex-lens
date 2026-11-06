export type ConfidenceRating = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DiagnosticCause {
  title: string;
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: string;
  whyLikely: string;
  isConfirmed: boolean;
}

export interface TechnicalCitation {
  sourceTitle: string;
  authority: 'Microsoft Learn' | 'Microsoft Support' | 'Hardware OEM' | 'Windows Sysinternals' | 'Official KB';
  url: string;
  summary: string;
  kbOrErrorCode?: string;
}

export interface TroubleshootingStep {
  stepNumber: number;
  title: string;
  description: string;
  simpleExplanation: string;
  actionType: 'gui_action' | 'powershell_cmd' | 'cmd_command' | 'hardware_check' | 'reboot_check';
  command?: string;
  isAdministratorRequired?: boolean;
  expectedOutcome: string;
  verificationCriteria: string;
  safetyCaution?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  userNotes?: string;
  companionActionId?: string;
}

export interface DiagnosisReport {
  id: string;
  createdAt: string;
  problemSummary: string;
  detectedErrorCodes: string[];
  affectedComponent: string;
  systemContext: string;
  observedSymptoms: string[];
  confirmedFacts: string[];
  possibleCauses: DiagnosticCause[];
  missingInformation: string[];
  recommendedTests: string[];
  troubleshootingSteps: TroubleshootingStep[];
  citations: TechnicalCitation[];
  confidence: ConfidenceRating;
  capturedImage?: string;
  mode: 'camera_visual' | 'connected_companion';
}

export interface VerificationResult {
  isResolved: boolean;
  status: 'RESOLVED' | 'PARTIALLY_RESOLVED' | 'UNRESOLVED' | 'NEW_ERROR_APPEARED';
  observedState: string;
  detectedDifferences: string[];
  explanation: string;
  recommendedNextStep: string;
  confidence: number;
}

export interface ReassessmentResult {
  analysisOfFailure: string;
  ruledOutCauses: string[];
  newHypothesis: string;
  alternativeSteps: TroubleshootingStep[];
  warningNotice?: string;
}

export interface CompanionSystemStats {
  computerName: string;
  osVersion: string;
  architecture: string;
  uptimeHours: number;
  cpuUsagePercent: number;
  ramUsagePercent: number;
  diskFreeGb: number;
  networkInterface: string;
  ipAddress: string;
  internetReachable: boolean;
  pendingUpdatesCount: number;
  spoolerStatus: string;
  wlanStatus: string;
}

export interface CompanionRepairAction {
  id: string;
  title: string;
  description: string;
  command: string;
  category: 'network' | 'services' | 'storage' | 'system_integrity' | 'updates';
  requiresAdmin: boolean;
  potentialConsequences: string;
  rollbackPlan: string;
  executionStatus: 'idle' | 'awaiting_approval' | 'executing' | 'success' | 'failed';
  lastOutput?: string;
  exitCode?: number;
}

export interface TroubleshootingScenario {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  errorBadge: string;
  imageUrl: string;
  sampleUserPrompt: string;
  expectedRootCause: string;
}
