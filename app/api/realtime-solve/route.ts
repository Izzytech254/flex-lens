import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { frameBase64, sessionContext, currentStepNumber, userSpokenInput } = body;

    if (!frameBase64) {
      return NextResponse.json({ error: 'Live video frame required.' }, { status: 400 });
    }

    let cleanBase64 = frameBase64;
    let mimeType = 'image/jpeg';
    const dataUrlMatch = frameBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (dataUrlMatch) {
      const detected = dataUrlMatch[1].toLowerCase();
      mimeType = detected === 'image/jpg' ? 'image/jpeg' : detected;
      cleanBase64 = dataUrlMatch[2];
    } else {
      cleanBase64 = frameBase64.replace(/^data:image\/\w+;base64,/, '');
    }

    const promptText = `
You are FixLens, a real AI computer technician inspecting a real screen capture or live camera frame.
Conduct a rigorous visual forensic examination of this computer screen.

SESSION CONTEXT:
${sessionContext ? JSON.stringify(sessionContext) : 'Scanning live screen'}
Step Number: ${currentStepNumber || 1}
${userSpokenInput ? `User asked: "${userSpokenInput}"` : ''}

FORENSIC REQUIREMENTS:
1. Look closely at the image:
   - Identify the exact visible error message, error dialog box, hex code (e.g. 0x800704cf, 0xc0000005, 0x80070002, 0x000006ba), BSOD bugcheck, command line error, or system status.
   - If no error is visible on screen, state what is visible (e.g. "Windows desktop with no active error" or "Browser window open") and set screenState to "NO_ERROR_DETECTED".
   - If an error is visible, set screenState to "ERROR_ACTIVE".
2. Identify the EXACT affected Windows component or application (e.g. WLAN AutoConfig 'wlansvc', Print Spooler 'spoolsv.exe', Windows Update Agent 'wuauserv', Graphics Driver, .NET Runtime).
3. Generate concise, authoritative spoken audio technician feedback (1-2 sentences):
   - State what problem you see.
   - Explain how to solve it in plain English.
4. Provide the exact recommended PowerShell / CMD command or exact GUI step.
5. Provide a bounding box [topPercent, leftPercent, widthPercent, heightPercent] framing the detected error on the screen.
6. Provide 2-3 specific possible causes based strictly on the screen evidence.
7. Provide 2-3 sequential troubleshooting steps (Step 1, Step 2, Step 3) to guide the user through resolving this exact error.

RETURN STRICT JSON:
{
  "screenState": "ERROR_ACTIVE" | "NO_ERROR_DETECTED" | "RESOLVED" | "FIX_IN_PROGRESS",
  "detectedError": "Name of error (e.g. 'Network Connection Problem (0x800704cf)')",
  "errorCode": "e.g. 0x800704cf or N/A",
  "affectedComponent": "e.g. WLAN AutoConfig / wlansvc",
  "observedSymptomSummary": "Concise summary of what is visible on this screen",
  "possibleCauses": [
    "Technical cause 1 based on screen",
    "Technical cause 2 based on screen",
    "Technical cause 3 based on screen"
  ],
  "realtimeSpokenGuidance": "Spoken sentence for voice TTS stating what problem was spotted and how to solve it.",
  "currentActionInstruction": "Text prompt explaining the immediate troubleshooting action.",
  "exactCommand": "Exact command line syntax or N/A",
  "companionActionId": "restart-wlan" | "restart-spooler" | "reset-update-services" | "flush-dns" | "reset-winsock" | "clean-temp" | null,
  "confidence": number between 0.0 and 1.0,
  "isResolved": boolean,
  "resolutionDetails": "Detailed forensic notes on visible screen state",
  "boundingBoxHint": {
    "label": "Error Box",
    "topPercent": 25,
    "leftPercent": 20,
    "widthPercent": 60,
    "heightPercent": 40
  },
  "troubleshootingSteps": [
    {
      "stepNumber": 1,
      "title": "Short title (e.g. 'Open Windows Settings')",
      "description": "Clear action instruction",
      "command": "PowerShell command or null",
      "actionType": "gui_action" | "powershell_cmd",
      "calloutLabel": "e.g. 'Click Settings' or 'Run Command'"
    }
  ]
}
`;

    const contents = [
      {
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      },
      { text: promptText },
    ];

    const response = await generateContentWithFallback({
      contents,
      systemInstruction:
        'You are FixLens, a real AI computer technician. You only analyze real visual evidence from computer screen captures and deliver honest, accurate technical diagnoses without fabricating data. Return strictly parseable JSON.',
      responseMimeType: 'application/json',
    });

    const rawText = response.text?.trim() || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json({
      success: true,
      analysis: parsed,
    });
  } catch (error: any) {
    console.error('Real-time video solve error:', error);
    return NextResponse.json(
      { error: error.message || 'Real-time video analysis failed.' },
      { status: 500 }
    );
  }
}
