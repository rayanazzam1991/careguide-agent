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
  /\b(jailbreak|developer mode|do anything now|unrestricted mode)\b/i,
  /\b(bypass|disable|override)\b.{0,40}\b(guardrails?|safety|policy|instructions?)\b/i,
  /\bpretend (you are|to be)\b.{0,40}\b(unrestricted|another ai|developer|system)\b/i,
  /\b(system|developer) (prompt|message|instructions?)\b/i,
  /\b(run|execute|call)\b.{0,30}\b(arbitrary|hidden|unauthorized)\b.{0,20}\b(tool|function|command)\b/i,
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

const bookingScopePatterns = [
  /\b(appointment|book|booking|schedule|reschedule|cancel|service|provider|doctor|specialist)\b/i,
  /\b(availability|available|slot|location|vienna|online|price|cost|fee|insurance)\b/i,
  /\b(general practice|dermatology|physiotherapy|nutrition|handoff|human support|help content|faq)\b/i,
]

const smallTalkPatterns = [
  /^(hi|hello|hey|good (morning|afternoon|evening)|how are you|how's it going|who are you|what can you do)[!.?\s]*$/i,
  /^(thanks|thank you|cheers|bye|goodbye|see you)[!.?\s]*$/i,
]

const offTopicPatterns = [
  /\b(write|debug|fix|generate)\b.{0,30}\b(code|javascript|typescript|python|essay|email|poem|story)\b/i,
  /\b(weather|sports?|football|recipe|cooking|stock market|crypto|politics|election|celebrity|horoscope)\b/i,
  /\b(tell me a joke|relationship advice|dating advice|homework|translate this)\b/i,
]

export type DeterministicGuardrail = 'small_talk' | 'off_topic' | null

/** Routes obvious non-booking requests without sending conversation text to a model. */
export function detectDeterministicGuardrail(text: string): DeterministicGuardrail {
  const normalized = text.trim().replace(/\s+/g, ' ').slice(0, 4000)
  if (!normalized || bookingScopePatterns.some(pattern => pattern.test(normalized))) return null
  if (smallTalkPatterns.some(pattern => pattern.test(normalized))) return 'small_talk'
  if (offTopicPatterns.some(pattern => pattern.test(normalized))) return 'off_topic'
  return null
}

const deterministicMessages: Record<Exclude<DeterministicGuardrail, null>, string> = {
  small_talk: 'Hello! I’m CareGuide, a focused booking assistant. I can help you choose a service, find a fictional provider, and book an appointment. What would you like to book?',
  off_topic: 'I’m here only to help with the CareGuide appointment-booking workflow, so I can’t help with that request. I can help you choose a service, find a fictional provider, check availability, or arrange a human-support handoff.',
}

export function deterministicGuardrailMessage(guardrail: Exclude<DeterministicGuardrail, null>): string {
  return deterministicMessages[guardrail]
}
