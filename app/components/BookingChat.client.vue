<script setup lang="ts">
import { useChat } from '@ai-sdk/vue'
import { DefaultChatTransport, getToolName, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from 'ai'

const input = ref('')
const suggestions = ['I need an online appointment this week', 'Show me dermatology options', 'How does this demo protect patient data?']

const { messages, status, error, sendMessage, stop, addToolApprovalResponse } = useChat<UIMessage>(() => ({
  transport: new DefaultChatTransport({ api: '/api/chat', credentials: 'same-origin' }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  messages: [{ id: 'welcome', role: 'assistant', parts: [{ type: 'text', text: 'Hi, I’m CareGuide. I coordinate fictional appointments without making clinical decisions. What kind of appointment would you like to arrange?' }] }],
}))

const busy = computed(() => status.value === 'submitted' || status.value === 'streaming')

function textParts(message: UIMessage) {
  return message.parts.filter(part => part.type === 'text')
}

interface ToolView {
  name: string
  state: string
  approvalId?: string
  output?: unknown
}

function toolView(part: UIMessage['parts'][number]): ToolView | null {
  if (!isToolUIPart(part)) return null
  return {
    name: getToolName(part),
    state: part.state,
    approvalId: part.state === 'approval-requested' ? part.approval.id : undefined,
    output: part.state === 'output-available' ? part.output : undefined,
  }
}

async function submit(text = input.value) {
  const value = text.trim()
  if (!value || busy.value) return
  input.value = ''
  await sendMessage({ text: value })
}

async function approve(id: string, approved: boolean) {
  await addToolApprovalResponse({ id, approved, reason: approved ? 'User confirmed the booking summary' : 'User declined the booking' })
}
</script>

<template>
  <section class="chat-card panel" aria-label="Conversation with CareGuide">
    <header class="chat-head">
      <div class="agent-avatar">CG</div>
      <div>
        <strong>CareGuide agent</strong>
        <span><i /> Operational booking only</span>
      </div>
      <button v-if="busy" class="stop" type="button" @click="stop">Stop</button>
    </header>

    <div class="messages" aria-live="polite">
      <article v-for="message in messages" :key="message.id" :class="['message', message.role]">
        <span class="speaker">{{ message.role === 'user' ? 'You' : 'CareGuide' }}</span>
        <p v-for="(part, index) in textParts(message)" :key="index">{{ part.text }}</p>
        <template v-for="(part, index) in message.parts" :key="`part-${index}`">
          <div v-if="toolView(part)" class="tool-card">
            <div class="tool-title">
              <span>Tool</span>
              <strong>{{ toolView(part)?.name }}</strong>
              <em>{{ toolView(part)?.state.replaceAll('-', ' ') }}</em>
            </div>
            <pre v-if="toolView(part)?.output">{{ JSON.stringify(toolView(part)?.output, null, 2) }}</pre>
            <div v-if="toolView(part)?.approvalId" class="approval">
              <p>This action creates the fictional booking. Review the details before continuing.</p>
              <button type="button" class="button button-primary" @click="approve(toolView(part)!.approvalId!, true)">Approve booking</button>
              <button type="button" class="button button-secondary" @click="approve(toolView(part)!.approvalId!, false)">Decline</button>
            </div>
          </div>
        </template>
      </article>
      <div v-if="busy" class="thinking"><span /><span /><span /> CareGuide is checking the workflow</div>
      <div v-if="error" class="chat-error">{{ error.message }}</div>
    </div>

    <div class="suggestions">
      <button v-for="suggestion in suggestions" :key="suggestion" type="button" :disabled="busy" @click="submit(suggestion)">{{ suggestion }}</button>
    </div>
    <form class="composer" @submit.prevent="submit()">
      <label class="sr-only" for="chat-input">Message CareGuide</label>
      <textarea id="chat-input" v-model="input" rows="2" maxlength="4000" placeholder="Ask about booking—not symptoms or treatment" @keydown.enter.exact.prevent="submit()" />
      <button class="send" type="submit" :disabled="!input.trim() || busy" aria-label="Send message">↗</button>
    </form>
  </section>
</template>

<style scoped>
.chat-card { min-height: 680px; display: flex; flex-direction: column; overflow: hidden; }
.chat-head { display: flex; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--line); }
.agent-avatar { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 14px 14px 14px 5px; background: var(--ink); color: var(--mint); font-weight: 800; font-size: 12px; }
.chat-head div:nth-child(2) { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.chat-head span { color: var(--muted); font-size: 12px; }
.chat-head i { display: inline-block; width: 7px; height: 7px; background: #3ba778; border-radius: 50%; margin-right: 5px; }
.stop { background: none; border: 0; color: var(--red); cursor: pointer; font-weight: 700; }
.messages { flex: 1; overflow: auto; padding: 24px; display: flex; flex-direction: column; gap: 18px; max-height: 520px; }
.message { max-width: 85%; }
.message.user { align-self: flex-end; background: var(--ink); color: white; padding: 13px 16px; border-radius: 18px 18px 5px 18px; }
.message.assistant { align-self: flex-start; }
.speaker { display: block; text-transform: uppercase; letter-spacing: .1em; font-size: 9px; font-weight: 800; opacity: .58; margin-bottom: 5px; }
.message p { white-space: pre-wrap; margin: 0; font-size: 14px; line-height: 1.55; }
.message p + p { margin-top: 8px; }
.tool-card { margin-top: 10px; border: 1px solid var(--line); border-radius: 15px; background: #f8faf7; overflow: hidden; min-width: min(480px, 75vw); }
.tool-title { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--line); font-size: 11px; }
.tool-title span { color: var(--green); font-weight: 800; text-transform: uppercase; }
.tool-title em { margin-left: auto; color: var(--muted); font-style: normal; }
pre { margin: 0; padding: 12px; max-height: 180px; overflow: auto; font-size: 10px; white-space: pre-wrap; }
.approval { padding: 14px; display: flex; flex-wrap: wrap; gap: 8px; }
.approval p { width: 100%; margin-bottom: 4px; }
.approval .button { padding: 9px 12px; font-size: 12px; }
.thinking { color: var(--muted); font-size: 12px; display: flex; align-items: center; gap: 5px; }
.thinking span { width: 5px; height: 5px; border-radius: 50%; background: var(--green); animation: pulse 1.1s infinite alternate; }
.thinking span:nth-child(2) { animation-delay: .2s; }.thinking span:nth-child(3) { animation-delay: .4s; }
@keyframes pulse { to { transform: translateY(-4px); opacity: .35; } }
.chat-error { padding: 10px 12px; background: #fff0ed; color: var(--red); border-radius: 10px; font-size: 12px; }
.suggestions { padding: 0 18px 12px; display: flex; gap: 7px; overflow-x: auto; }
.suggestions button { white-space: nowrap; border: 1px solid var(--line); border-radius: 99px; background: white; padding: 7px 10px; color: var(--muted); cursor: pointer; font-size: 11px; }
.composer { margin: 0 16px 16px; border: 1px solid var(--line); border-radius: 17px; background: white; display: flex; align-items: flex-end; padding: 6px; box-shadow: 0 5px 20px rgba(16,45,39,.06); }
.composer textarea { flex: 1; resize: none; border: 0; outline: 0; padding: 8px; color: var(--ink); background: transparent; }
.send { border: 0; width: 38px; height: 38px; border-radius: 12px; background: var(--green); color: white; font-size: 20px; cursor: pointer; }
.send:disabled { opacity: .4; cursor: not-allowed; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
@media (max-width: 760px) { .chat-card { min-height: 620px; }.messages { padding: 18px; }.message { max-width: 94%; } }
</style>
