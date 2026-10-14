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

/** Normalize a complete spoken turn, not individual chunks (which causes pumping). */
export function normalizeLiveSpeech(samples: Float32Array) {
  let peak = 0, energy = 0;
  for (const sample of samples) { peak = Math.max(peak, Math.abs(sample)); energy += sample * sample; }
  if (!samples.length || peak < 0.0001) return samples;
  const rms = Math.sqrt(energy / samples.length);
  const gain = Math.min(16, 0.12 / rms, 0.22 / peak);
  return Float32Array.from(samples, sample => sample * gain);
}

/** Browser-standard microphone + PCM playback. Never uses SpeechRecognition/speechSynthesis. */
export function startLiveAppointmentSession(options: Options): LiveAppointmentSession {
  let closed = false, connected = false, muted = false, micAllowed = false;
  let voiceActivated = false, turnFinished = false;
  const preparedGreeting = getPreparedLiveGreeting(options);
  const greetingFrames: string[] = [];
  const responseFrames: string[] = [];
  let responseSize = 0;
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
  let playbackGain: GainNode | null = null;
  let playbackLimiter: DynamicsCompressorNode | null = null;
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
    responseFrames.length = 0; responseSize = 0;
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
    playbackGain?.disconnect();
    playbackLimiter?.disconnect();
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
    listening();
  };
  const playSamples = (samples: Float32Array) => {
    if (closed || !context) return;
    // Let the mobile output route wake up before the first spoken sample.
    const padding = 7200;
    const buffer = context.createBuffer(1, samples.length + padding, 24000);
    buffer.copyToChannel(normalizeLiveSpeech(samples), 0, padding);
    if (context.state !== 'running') void context.resume().catch(() => fail('LIVE_AUDIO_UNAVAILABLE'));
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(playbackGain!);
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
  const playGreeting = (frames: string[]) => {
    if (!frames.length) return;
    const chunks = frames.map(decodeLivePCM);
    const samples = new Float32Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) { samples.set(chunk, offset); offset += chunk.length; }
    playSamples(samples);
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
        micAllowed = false; listening();
        if (firstGreeting) {
          greetingSize += message.data.length;
          if (greetingSize > 1024 * 1024) throw new Error('Greeting too large');
          greetingFrames.push(message.data);
          turnFinished = false;
          return;
        }
        turnFinished = false;
        responseSize += message.data.length;
        if (responseSize > 12 * 1024 * 1024) throw new Error('Speech too large');
        responseFrames.push(message.data);
      }
      if (message.type === 'turnComplete') {
        if (firstGreeting) {
          playGreeting(greetingFrames);
          storeLiveGreeting(options, greetingFrames);
          firstGreeting = false;
        } else {
          playGreeting(responseFrames);
          responseFrames.length = 0; responseSize = 0;
        }
        turnFinished = true; allowMicAfterAudio();
      }
      if (message.type === 'interrupted') {
        // An already-buffered reply is complete. A late provider interruption
        // cannot clip it; explicit user text already stops playback in sendText.
        if (players.size && !micAllowed) return;
        stopPlayers(); turnFinished = false;
        if (firstGreeting) { greetingFrames.length = 0; greetingSize = 0; }
      }
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
      micAllowed = false; turnFinished = false; listening();
      if (callId) { send({ type: 'reply', id: callId, text }); callId = null; }
      else send({ type: 'say', text });
    },
    sendText: text => {
      if (!connected || closed || !text.trim()) return;
      stopPlayers();
      micAllowed = false; turnFinished = false; listening();
      voiceActivated = true;
      send({ type: 'text', text: text.trim() });
    },
    setMuted: value => {
      muted = value;
      stream?.getAudioTracks().forEach(track => { track.enabled = !muted && !closed; });
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
      // Use the device's native rate. Provider buffers still declare 24kHz and
      // the input encoder resamples to 16kHz; forcing the output device to 24kHz
      // can reconfigure Android's audio route when microphone capture starts.
      try { context = new Context({ latencyHint: 'interactive' }); } catch { context = new Context(); }
      // Boost only the assistant output (+12dB), never the captured microphone.
      // A shared compressor controls peaks without changing gains between PCM chunks.
      playbackGain = context.createGain();
      playbackGain.gain.value = 4;
      playbackLimiter = context.createDynamicsCompressor();
      playbackLimiter.threshold.value = -6;
      playbackLimiter.knee.value = 0;
      playbackLimiter.ratio.value = 20;
      playbackLimiter.attack.value = 0.003;
      playbackLimiter.release.value = 0.15;
      playbackGain.connect(playbackLimiter);
      playbackLimiter.connect(context.destination);
      const resumed = context!.resume().then(() => null, error => error);
      // Choose ONE input graph before playback. Never hot-swap processors while
      // the greeting is playing. A broken worklet must not stall opening.
      const workletReady = new Promise<boolean>(resolve => {
        if (!context!.audioWorklet || typeof AudioWorkletNode === 'undefined') { resolve(false); return; }
        const deadline = setTimeout(() => resolve(false), 500);
        try {
          void context!.audioWorklet.addModule('/assistant-pcm-worklet.js').then(() => {
            clearTimeout(deadline); resolve(true);
          }, () => { clearTimeout(deadline); resolve(false); });
        } catch { clearTimeout(deadline); resolve(false); }
      });
      const mic = navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false,
      });
      const response = apiRequest('POST', '/api/ai-appointment-assistant/live-session', {
        mode: options.mode, language: options.language, greeting: options.greeting,
        conversationId: options.conversationId, skipGreeting: Boolean(preparedGreeting),
      }, { signal: abort.signal }).then(value => ({ value }), error => ({ error }));
      stream = await mic;
      if (closed) { stream.getTracks().forEach(track => track.stop()); return; }
      // Keep the input device active to avoid changing mobile audio routing
      // between speaking/listening. handleSamples discards ALL captured input
      // until greeting playback ends; only an explicit mute disables the track.
      stream.getAudioTracks().forEach(track => { track.enabled = !muted; });
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
      const canUseWorklet = await workletReady;
      if (closed) return;
      if (canUseWorklet) {
        try {
          const worklet = new AudioWorkletNode(context!, 'appointment-pcm');
          worklet.port.onmessage = event => handleSamples(event.data);
          processor = worklet;
        } catch { /* Fall back before playback, never halfway through a sentence. */ }
      }
      if (!processor) {
        const fallback = context!.createScriptProcessor(2048, 1, 1);
        fallback.onaudioprocess = event => handleSamples(event.inputBuffer.getChannelData(0));
        processor = fallback;
      }
      microphone.connect(processor); processor.connect(silentGain); silentGain.connect(context!.destination);
      // Opening the microphone can reconfigure mobile audio output. Never play
      // the greeting before the input graph is ready, or its middle can be lost.
      if (preparedGreeting && !closed) {
        playGreeting(preparedGreeting);
        turnFinished = true;
      }
      listening();
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