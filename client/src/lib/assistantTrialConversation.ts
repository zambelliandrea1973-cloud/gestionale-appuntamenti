export interface AssistantTrialConversationStart {
  conversationId: string | null;
}

// One reservation per conversation, including simultaneous callbacks and paid
// accounts (whose server response deliberately has a null conversation token).
export function createAssistantTrialConversation() {
  let active = false;
  let id: string | null = null;
  let pending: Promise<string | null> | null = null;
  let generation = 0;
  return {
    isActive: () => active,
    getId: () => id,
    ensure(start: () => Promise<AssistantTrialConversationStart>): Promise<string | null> {
      if (active) return Promise.resolve(id);
      if (pending) return pending;
      const current = generation;
      const request = Promise.resolve().then(start).then(result => {
        if (current !== generation) throw new DOMException('Conversation reset', 'AbortError');
        id = result.conversationId;
        active = true;
        return id;
      }).finally(() => {
        if (current === generation) pending = null;
      });
      pending = request;
      return request;
    },
    reset() {
      generation++;
      active = false;
      id = null;
      pending = null;
    }
  };
}