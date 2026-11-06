import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';
import { DiagnosisReport } from '@/types/technician';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, userDescription, companionContext, mode } = body;

    if (!imageBase64 && !userDescription) {
      return NextResponse.json(
        { error: 'Either an image capture or a description of the computer issue is required.' },
        { status: 400 }
      );
    }

    // Build multimodal contents for Gemini
    const contents: Array<any> = [];

    const promptText = `
You are FixLens, a master-tier AI visual computer technician.
Analyze the user's computer screen capture and technical issue.

OPERATING CONSTRAINTS:
1. Conduct real, rigorous visual forensic analysis of the screen.
2. Read the EXACT error messages, hex error codes (e.g. 0x800704cf, 0xc0000005, 0x80070002, 0x000006ba), window titles, taskbar states, notification tray icons, and command outputs.
3. Identify the EXACT Windows component, driver, daemon, or software involved (e.g., WLAN AutoConfig 'wlansvc', Spooler 'spoolsv.exe', Windows Update Agent 'wuauserv', Graphics WDDM driver, Disk Storage Management, .NET Runtime).
4. Strictly separate OBSERVED SYMPTOMS from CONFIRMED FACTS and POTENTIAL CAUSES.
5. Provide a ranked list of possible causes with specific evidence from the image.
6. Provide clear, safe, step-by-step verified troubleshooting procedures. Include both the user-friendly explanation AND exact command lines (PowerShell or CMD) or exact Windows GUI navigation clicks.
7. Include safety notes/cautions (e.g. warning before restarting services or clearing caches).
8. Cite authoritative documentation (Microsoft Learn, Microsoft Support KBs, official vendor specs).
9. Define strict "Verification Criteria" for every step so the user can observe if the problem is fixed.

${userDescription ? `User's spoken/typed description: "${userDescription}"` : ''}
${companionContext ? `Connected Windows telemetry: ${JSON.stringify(companionContext)}` : ''}
Mode: ${mode || 'camera_visual'}

RETURN VALID JSON matching this exact structure:
{
  "problemSummary": "Precise 1-2 sentence statement of the core issue",
  "detectedErrorCodes": ["0x..."],
  "affectedComponent": "Windows Component / Service / Driver / App name",
  "systemContext": "e.g. Windows 11 23H2 / Wi-Fi Network Stack / NTFS Filesystem",
  "observedSymptoms": ["Visible error dialog: '...' in center screen", "Taskbar shows globe icon with 'No Internet'"],
  "confirmedFacts": ["The adapter hardware is recognized", "DHCP lease failed"],
  "possibleCauses": [
    {
      "title": "Cause name",
      "probability": "HIGH" | "MEDIUM" | "LOW",
      "evidence": "Concrete detail from image/context supporting this",
      "whyLikely": "Technical explanation of the mechanism",
      "isConfirmed": false
    }
  ],
  "missingInformation": ["Whether other devices on same Wi-Fi have internet", "Router admin status"],
  "recommendedTests": ["Ping local gateway (192.168.1.1)", "Check ipconfig /all"],
  "troubleshootingSteps": [
    {
      "stepNumber": 1,
      "title": "Action title",
      "description": "Clear step instructions",
      "simpleExplanation": "Plain-English explanation for everyday users",
      "actionType": "powershell_cmd" | "cmd_command" | "gui_action" | "hardware_check" | "reboot_check",
      "command": "powershell command if applicable",
      "isAdministratorRequired": true/false,
      "expectedOutcome": "What should visually happen or what output is expected",
      "verificationCriteria": "How to tell if this step succeeded",
      "safetyCaution": "Optional safety note"
    }
  ],
  "citations": [
    {
      "sourceTitle": "e.g. Troubleshoot Wi-Fi connection issues in Windows",
      "authority": "Microsoft Learn" | "Microsoft Support" | "Hardware OEM" | "Windows Sysinternals" | "Official KB",
      "url": "https://learn.microsoft.com/en-us/troubleshoot/windows-client/networking/...",
      "summary": "Official guidance on resetting TCP/IP stack and checking DHCP lease",
      "kbOrErrorCode": "KB500..."
    }
  ],
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}
`;

    // Add image if provided
    if (imageBase64) {
      // Clean base64 string
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    contents.push({
      text: promptText,
    });

    const response = await generateContentWithFallback({
      contents: contents,
      systemInstruction:
        'You are FixLens, a senior computer technician. You only deliver technically accurate, verified troubleshooting steps for actual Windows PC issues. Never hallucinate fake errors or non-existent commands. Respond strictly with parseable JSON.',
      responseMimeType: 'application/json',
    });

    const rawText = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Fallback in case of markdown wrapper
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const report: DiagnosisReport = {
      id: 'fl_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
      problemSummary: parsed.problemSummary || 'Computer diagnostic analysis completed.',
      detectedErrorCodes: Array.isArray(parsed.detectedErrorCodes) ? parsed.detectedErrorCodes : [],
      affectedComponent: parsed.affectedComponent || 'Windows Operating System',
      systemContext: parsed.systemContext || 'Windows System Environment',
      observedSymptoms: Array.isArray(parsed.observedSymptoms) ? parsed.observedSymptoms : [],
      confirmedFacts: Array.isArray(parsed.confirmedFacts) ? parsed.confirmedFacts : [],
      possibleCauses: Array.isArray(parsed.possibleCauses) ? parsed.possibleCauses : [],
      missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
      recommendedTests: Array.isArray(parsed.recommendedTests) ? parsed.recommendedTests : [],
      troubleshootingSteps: Array.isArray(parsed.troubleshootingSteps)
        ? parsed.troubleshootingSteps.map((s: any, idx: number) => ({
            ...s,
            stepNumber: s.stepNumber || idx + 1,
            status: 'pending',
          }))
        : [],
      citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      confidence: parsed.confidence || 'HIGH',
      capturedImage: imageBase64 ? imageBase64.substring(0, 500) + '...[truncated]' : undefined,
      mode: mode || 'camera_visual',
    };

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error('Diagnosis error:', error);
    return NextResponse.json(
      {
        error: error.message || 'An error occurred while diagnosing the computer screen.',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
