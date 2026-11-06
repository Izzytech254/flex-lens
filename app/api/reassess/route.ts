import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';
import { ReassessmentResult } from '@/types/technician';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { report, failedStep, failureDetail } = body;

    if (!report || !failedStep) {
      return NextResponse.json(
        { error: 'Diagnosis report and failed step details are required.' },
        { status: 400 }
      );
    }

    const promptText = `
You are FixLens, a master AI visual computer technician handling a troubleshooting failure.

CONTEXT:
Original Problem: ${report.problemSummary}
Affected Component: ${report.affectedComponent}
Observed Symptoms: ${JSON.stringify(report.observedSymptoms)}

FAILED STEP:
Step #${failedStep.stepNumber}: ${failedStep.title}
Command/Action: ${failedStep.command || failedStep.description}
User's Failure Report / Error Returned: "${failureDetail || 'The step did not resolve the issue or produced an error'}"

CRITICAL ADAPTIVE INSTRUCTIONS:
1. Do NOT repeat the failed step or propose a trivial variant.
2. Formally analyze WHY this step failed based on Windows internals (e.g., elevation failure, dependency service stopped, locked registry key, corrupted store, hardware-level fault).
3. Identify which suspected causes are now ruled out.
4. Provide alternative, deeper, or specialized troubleshooting procedures that bypass the failure point.
5. Provide exact commands or exact GUI steps.

RETURN VALID JSON matching this structure:
{
  "analysisOfFailure": "Technical explanation of what the failure symptom reveals about the underlying state",
  "ruledOutCauses": ["Cause A", "Cause B"],
  "newHypothesis": "Updated primary hypothesis based on this new diagnostic evidence",
  "warningNotice": "Optional safety caution before attempting deeper repairs",
  "alternativeSteps": [
    {
      "stepNumber": 1,
      "title": "Alternative Action Title",
      "description": "Specific instruction",
      "simpleExplanation": "Clear explanation for the user",
      "actionType": "powershell_cmd" | "cmd_command" | "gui_action" | "reboot_check",
      "command": "powershell or cmd syntax",
      "isAdministratorRequired": true,
      "expectedOutcome": "What should happen",
      "verificationCriteria": "How to verify success",
      "safetyCaution": "Important caveat"
    }
  ]
}
`;

    const response = await generateContentWithFallback({
      contents: promptText,
      systemInstruction:
        'You are FixLens, adapting to failed computer repair attempts with systematic Windows systems diagnosis. Return strictly valid JSON.',
      responseMimeType: 'application/json',
    });

    const rawText = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const reassessment: ReassessmentResult = {
      analysisOfFailure: parsed.analysisOfFailure || 'The previous step encountered an unexpected state.',
      ruledOutCauses: Array.isArray(parsed.ruledOutCauses) ? parsed.ruledOutCauses : [],
      newHypothesis: parsed.newHypothesis || 'Investigating secondary root causes.',
      alternativeSteps: Array.isArray(parsed.alternativeSteps)
        ? parsed.alternativeSteps.map((s: any, idx: number) => ({
            ...s,
            stepNumber: idx + 1,
            status: 'pending',
          }))
        : [],
      warningNotice: parsed.warningNotice,
    };

    return NextResponse.json({ success: true, reassessment });
  } catch (error: any) {
    console.error('Reassessment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to adapt diagnostic procedure.' },
      { status: 500 }
    );
  }
}
