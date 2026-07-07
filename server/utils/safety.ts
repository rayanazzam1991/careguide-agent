const emergencyPatterns = [
  /\b(emergency|call an ambulance|cannot breathe|can't breathe|severe chest pain|unconscious|overdose)\b/i,
  /\b(suicidal|kill myself|end my life)\b/i,
]

const clinicalPatterns = [
  /\b(diagnose|diagnosis|what medicine|what medication|should i take|is this cancer|treatment plan)\b/i,
  /\b(symptom|rash|pain|fever|dose|dosage)\b/i,
]

const injectionPatterns = [
  /ignore (all|any|the) (previous|prior|system) instructions/i,
  /reveal (your|the) (prompt|system message|secrets?)/i,
  /service[_ -]?role|supabase.*key|openai.*key/i,
]

export type SafetyBoundary = 'emergency' | 'clinical' | 'injection' | null

export function detectSafetyBoundary(text: string): SafetyBoundary {
  if (emergencyPatterns.some(pattern => pattern.test(text))) return 'emergency'
  if (injectionPatterns.some(pattern => pattern.test(text))) return 'injection'
  if (clinicalPatterns.some(pattern => pattern.test(text))) return 'clinical'
  return null
}

export function safetyMessage(boundary: Exclude<SafetyBoundary, null>): string {
  if (boundary === 'emergency') {
    return 'I cannot assess an emergency. If you may be in immediate danger in Austria, call ambulance **144** or European emergency **112** now. For non-emergency health advice, call **1450**. I can pause this demo and arrange a fictional human handoff, but I cannot make a clinical decision.'
  }
  if (boundary === 'clinical') {
    return 'I can help coordinate an appointment, but I cannot diagnose symptoms, recommend treatment, or choose medication. I can help you book a qualified professional or create a fictional human-support handoff.'
  }
  return 'I cannot reveal private instructions, credentials, or data from another session. I can only help with the CareGuide booking workflow.'
}
