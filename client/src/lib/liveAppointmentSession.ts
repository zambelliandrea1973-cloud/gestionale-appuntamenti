import { apiRequest } from './queryClient';
import { liveInterpretationSchema, type LiveInterpretation } from '../../../shared/liveAppointmentProtocol';
import { getPreparedLiveGreeting, storeLiveGreeting } from './liveAppointmentGreeting';

interface Options {
  mode: 'work' | 'personal';
  language: string;
  greeting: string;
  conversationId?: string | null;
  onListening: (value: boolean) => void;
  onTranscript: (text: string) => void;
  onTurn: (text: string, interpretation: LiveInterpretation) => Promise<void>;
  onActive: (conversationId: string | null) => void;
  onError: (code: string) => void;
}
export interface LiveAppointmentSession {
  close: () => void;
  respond: (text: string) => void;
  sendText: (text: string) => void;
  setMuted: (value: boolean) => void;
  ready: () => boolean;
  active: () => boolean;
}

export function encodeLivePCM(samples: Float32Array, inputRate: number) {
  const ratio = inputRate / 16000;
  const size = Math.floor(samples.length / ratio);
  const bytes = new Uint8Array(size * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < size; index++) {
    const start = Math.floor(index * ratio), end = Math.max(start + 1, Math.floor((index + 1) * ratio));
    let value = 0;
    for (let offset = start; offset < end; offset++) value += samples[offset] || 0;
    value = Math.max(-1, Math.min(1, value / (end - start)));
    view.setInt16(index * 2, value < 0 ? value * 32768 : value * 32767, true);
  }
  let binary = '';
  for (const byte of Array.from(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export function decodeLivePCM(data: string) {
  const binary = atob(data);
  if (!binary.length || binary.length % 2 || binary.length > 1024 * 1024) throw new Error('Invalid audio');
  const bytes = Uint8Array.from(binary, value => value.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(bytes.length / 2);
  for (let index = 0; index < samples.length; index++) samples[index] = view.getInt16(index * 2, true) / 32768;
  return samples;
}

/** Browser-standard microphone + PCM playback. Never uses SpeechRecognition/speechSynthesis. */
export function startLiveAppointmentSession(options: Options): LiveAppointmentSession {
  let closed = false, connected = false, muted = false, micAllowed = false;
  let voiceActivated = false, turnFinished = false;
  const preparedGreeting = getPreparedLiveGreeting(options);
  const greetingFrames: string[] = [];
  let greetingSize = 0;
  let firstGreeting = !preparedGreeting;
  const pendingAudio: string[] = [];
  let pendingAudioSize = 0;
  let callId: string | null = null;
  let socket: WebSocket | null = null;
  let context: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let processor: ScriptProcessorNode | AudioWorkletNode | null = null;
  let microphone: MediaStreamAudioSourceNode | null = null;
  let silentGain: GainNode | null = null;
  let nextAudioTime = 0, audioEpoch = 0;
  let loudFrames = 0;
  const preRoll: string[] = [];
  const players = new Set<AudioBufferSourceNode>();
  const abort = new AbortController();
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  const listening = () => options.onListening(!closed && !!stream && micAllowed && !muted);
  const send = (data: object) => {
    if (closed || socket?.readyState !== WebSocket.OPEN) return false;
    if (socket.bufferedAmount > 256 * 1024) { fail('LIVE_CONNECTION_ERROR'); return false; }
    socket.send(JSON.stringify(data));
    return true;
  };
  const stopPlayers = () => {
    audioEpoch++;
    for (const player of Array.from(players)) { player.onended = null; try { player.stop(); } catch { /* Already ended. */ } }
    players.clear();
    nextAudioTime = context?.currentTime || 0;
  };
  const close = () => {
    if (closed) return;
    closed = true;
    abort.abort();
    pendingAudio.length = 0;
    clearTimeout(startTimer);
    document.removeEventListener('visibilitychange', visibility);
    stopPlayers();
    if (processor) {
      if ('port' in processor) { processor.port.onmessage = null; processor.port.close(); }
      else processor.onaudioprocess = null;
      processor.disconnect();
    }
    microphone?.disconnect();
    silentGain?.disconnect();
    stream?.getTracks().forEach(track => track.stop());
    if (socket) { socket.onmessage = socket.onclose = socket.onerror = socket.onopen = null; socket.close(); }
    if (context) void context.close().catch(() => {});
    listening();
  };
  const fail = (code: string) => { if (!closed) { close(); options.onError(code); } };
  function visibility() { if (document.hidden) fail('LIVE_BACKGROUND'); }
  const allowMicAfterAudio = () => {
    if (closed || !turnFinished || players.size) return;
    micAllowed = true;
    stream?.getAudioTracks().forEach(track => { track.enabled = !muted; });
    listening();
  };
  const play = (data: string) => {
    if (closed || !context) return;
    const samples = decodeLivePCM(data);
    const buffer = context.createBuffer(1, samples.length, 24000);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    nextAudioTime = Math.max(nextAudioTime, context.currentTime + 0.015);
    const epoch = audioEpoch;
    players.add(source);
    source.onended = () => {
      players.delete(source);
      source.disconnect();
      if (epoch === audioEpoch) allowMicAfterAudio();
    };
    source.start(nextAudioTime);
    nextAudioTime += buffer.duration;
  };
  const receive = async (event: MessageEvent) => {
    if (closed) return;
    try {
      const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text());
      if (closed) return;
      if (message.type === 'ready') {
        connected = true;
        clearTimeout(startTimer);
        for (const data of pendingAudio) { if (!send({ type: 'audio', data })) break; }
        pendingAudio.length = 0; pendingAudioSize = 0;
      }
      if (message.type === 'active') options.onActive(message.conversationId);
      if (message.type === 'audio') {
        if (firstGreeting) {
          greetingSize += message.data.length;
          if (greetingSize <= 1024 * 1024) greetingFrames.push(message.data);
          else greetingFrames.length = 0;
        }
        turnFinished = false; play(message.data);
      }
      if (message.type === 'turnComplete') {
        if (firstGreeting) { storeLiveGreeting(options, greetingFrames); firstGreeting = false; }
        turnFinished = true; allowMicAfterAudio();
      }
      if (message.type === 'interrupted') { stopPlayers(); turnFinished = false; }
      if (message.type === 'cancelTurn') callId = null;
      if (message.type === 'transcript') options.onTranscript(message.text);
      if (message.type === 'turn') {
        const parsed = liveInterpretationSchema.safeParse(message.interpretation);
        if (!parsed.success || typeof message.text !== 'string' || typeof message.id !== 'string') throw new Error('Invalid turn');
        callId = message.id;
        await options.onTurn(message.text, parsed.data);
        // Every tool invocation must settle even when a UI guard rejects a turn.
        if (!closed && callId === message.id) {
          send({ type: 'reply', id: callId, text: 'Non ho completato questa richiesta. Ripeti per favore.' });
          callId = null;
        }
      }
      if (message.type === 'error') fail(message.code || 'LIVE_CONNECTION_ERROR');
    } catch { fail('LIVE_CONNECTION_ERROR'); }
  };
  const session: LiveAppointmentSession = {
    close,
    ready: () => connected && !closed,
    active: () => !closed,
    respond: text => {
      if (callId) { send({ type: 'reply', id: callId, text }); callId = null; }
      else send({ type: 'say', text });
    },
    sendText: text => {
      if (!connected || closed || !text.trim()) return;
      stopPlayers();
      voiceActivated = true;
      send({ type: 'text', text: text.trim() });
    },
    setMuted: value => {
      muted = value;
      stream?.getAudioTracks().forEach(track => { track.enabled = micAllowed && !muted && !closed; });
      if (value) {
        preRoll.length = 0; loudFrames = 0;
        if (!connected) { pendingAudio.length = 0; pendingAudioSize = 0; voiceActivated = false; }
        send({ type: 'mute' });
      }
      else if (context) void context.resume().catch(() => fail('LIVE_AUDIO_UNAVAILABLE'));
      listening();
    },
  };
  // AudioContext.resume and microphone permission are initiated IN the opening click,
  // not in a React effect or after an HTTP request (important for Safari/mobile autoplay).
  void (async () => {
    try {
      const Context = window.AudioContext || (window as any).webkitAudioContext;
      if (!Context || !navigator.mediaDevices?.getUserMedia) { fail('LIVE_MIC_UNAVAILABLE'); return; }
      try { context = new Context({ sampleRate: 24000 }); } catch { context = new Context(); }
      const resumed = context!.resume().then(() => {
        if (preparedGreeting && !closed) {
          for (const data of preparedGreeting) play(data);
          turnFinished = true;
        }
        return null;
      }, error => error);
      const mic = navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false,
      });
      const response = apiRequest('POST', '/api/ai-appointment-assistant/live-session', {
        mode: options.mode, language: options.language, greeting: options.greeting,
        conversationId: options.conversationId, skipGreeting: Boolean(preparedGreeting),
      }, { signal: abort.signal }).then(value => ({ value }), error => ({ error }));
      stream = await mic;
      if (closed) { stream.getTracks().forEach(track => track.stop()); return; }
      // Permission is requested in the click for mobile compatibility, but the
      // microphone track supplies silence until the initial greeting finishes.
      stream.getAudioTracks().forEach(track => { track.enabled = micAllowed && !muted; });
      if (await resumed) { fail('LIVE_AUDIO_UNAVAILABLE'); return; }
      if (context!.state !== 'running') { fail('LIVE_AUDIO_UNAVAILABLE'); return; }
      microphone = context!.createMediaStreamSource(stream);
      silentGain = context!.createGain();
      silentGain.gain.value = 0;
      const handleSamples = (samples: Float32Array) => {
        if (closed || !micAllowed || muted) return;
        const encoded = encodeLivePCM(samples, context!.sampleRate);
        const sendAudio = (data: string) => {
          if (connected) { send({ type: 'audio', data }); return; }
          // The cached greeting may finish before Live connects. Keep the user's
          // first words, rather than showing green while silently losing them.
          pendingAudio.push(data); pendingAudioSize += data.length;
          if (pendingAudioSize > 200_000) fail('LIVE_START_TIMEOUT');
        };
        if (!voiceActivated) {
          preRoll.push(encoded);
          if (preRoll.length > 4) preRoll.shift();
          const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
          loudFrames = rms > 0.012 ? loudFrames + 1 : 0;
          if (loudFrames < 2) return;
          voiceActivated = true;
          for (const frame of preRoll) sendAudio(frame);
          preRoll.length = 0;
        } else sendAudio(encoded);
      };
      // Start the standard graph immediately. addModule can stall on WebViews
      // and headless/audio-disabled browsers; it must NEVER block the socket/greeting.
      const fallback = context!.createScriptProcessor(2048, 1, 1);
      fallback.onaudioprocess = event => handleSamples(event.inputBuffer.getChannelData(0));
      processor = fallback;
      microphone.connect(processor); processor.connect(silentGain); silentGain.connect(context!.destination);
      listening();
      if (context!.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
        let expired = false;
        const workletDeadline = setTimeout(() => { expired = true; }, 1500);
        void context!.audioWorklet.addModule('/assistant-pcm-worklet.js').then(() => {
          clearTimeout(workletDeadline);
          if (closed || expired) return;
          const worklet = new AudioWorkletNode(context!, 'appointment-pcm');
          worklet.port.onmessage = event => handleSamples(event.data);
          microphone!.disconnect(fallback);
          fallback.onaudioprocess = null;
          fallback.disconnect();
          processor = worklet;
          microphone!.connect(worklet);
          worklet.connect(silentGain!);
        }).catch(() => { clearTimeout(workletDeadline); /* Keep the working standard graph. */ });
      }
      stream.getAudioTracks().forEach(track => track.addEventListener('ended', () => fail('LIVE_MIC_DENIED'), { once: true }));
      const settled = await response;
      if ('error' in settled) throw settled.error;
      const result = await settled.value.json();
      if (closed) return;
      const url = new URL(result.path, window.location.href);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(url);
      socket.onopen = () => { if (!closed) send({ type: 'start', ticket: result.ticket }); };
      socket.onmessage = event => { void receive(event); };
      socket.onerror = () => fail('LIVE_CONNECTION_ERROR');
      socket.onclose = () => fail('LIVE_CONNECTION_CLOSED');
      startTimer = setTimeout(() => fail('LIVE_START_TIMEOUT'), 15_000);
      document.addEventListener('visibilitychange', visibility);
    } catch (error) {
      if (!closed) fail(typeof (error as any)?.code === 'string' ? (error as any).code :
        (error as Error)?.name === 'NotAllowedError' ? 'LIVE_MIC_DENIED' : 'LIVE_CONNECTION_ERROR');
    }
  })();
  return session;
}