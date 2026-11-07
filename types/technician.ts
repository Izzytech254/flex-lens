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
  /** Voice-style version of the step (short spoken beats), used for narration */
  spokenInstruction?: string;
  actionType: 'gui_action' | 'powershell_cmd' | 'cmd_command' | 'terminal_cmd' | 'hardware_check' | 'reboot_check';
  command?: string;
  isAdministratorRequired?: boolean;
  expectedOutcome: string;
  verificationCriteria: string;
  safetyCaution?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  userNotes?: string;
  companionActionId?: string;
}

/** One complete way of fixing the problem. A diagnosis can offer several, most likely first. */
export interface Solution {
  title: string;
  summary: string;
  steps: TroubleshootingStep[];
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
  /** Steps of the solution currently being followed (kept for compatibility with older reports). */
  troubleshootingSteps: TroubleshootingStep[];
  /** Alternative ways to fix the problem; troubleshootingSteps mirrors solutions[activeSolution]. */
  solutions?: Solution[];
  activeSolution?: number;
  /** Spoken explanation of the problem in plain words */
  spokenExplanation?: string;
  citations: TechnicalCitation[];
  confidence: ConfidenceRating;
  /** Model-reported confidence between 0 and 1, when available */
  confidenceScore?: number;
  /** Set when the user confirms (true) or denies (false) that the fix worked */
  resolved?: boolean;
  capturedImage?: string;
  mode: 'camera_visual' | 'connected_companion' | 'text_description';
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
