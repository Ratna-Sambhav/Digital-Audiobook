import os
from openai import OpenAI
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv 
import queue

load_dotenv()

# setup AzureOpenAI client
client = OpenAI()



class PushAudioOutputStreamSampleCallback(speechsdk.audio.PushAudioOutputStreamCallback):
    """
    This class provides a callback mechanism to handle audio output streams for Azure's Text-to-Speech (TTS) service.
    It allows you to capture synthesized audio data in real time and push it to a buffer.

    Attributes:
        buffer: A buffer or queue where the audio stream data will be stored.
        sample_rate: The sample rate of the audio stream.
    """
    def __init__(self, buffer, sample_rate):
        self.buffer = buffer
        self.sample_rate = sample_rate

    def write(self, audio_buffer: memoryview) -> int:
        self.buffer.put(audio_buffer.tobytes())
        return audio_buffer.nbytes
    




audio_queue = queue.Queue()
# setup speech synthesizer
# IMPORTANT: MUST use the websocket v2 endpoint
speech_config = speechsdk.SpeechConfig(endpoint=f"wss://{os.getenv('AZURE_SERVICE_REGION')}.tts.speech.microsoft.com/cognitiveservices/websocket/v2",
                                       subscription=os.getenv("AZURE_SPEECH_KEY"))


# speech_config.set_speech_synthesis_output_format(self.AUDIO_FORMAT_MAP[self.audio_format])
stream_callback = PushAudioOutputStreamSampleCallback(audio_queue, 16000)
stream = speechsdk.audio.PushAudioOutputStream(stream_callback)
audio_config = speechsdk.audio.AudioOutputConfig(stream=stream)
# set a voice name
speech_config.speech_synthesis_voice_name = "en-US-BrianMultilingualNeural"
speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)


speech_synthesizer.synthesizing.connect(lambda evt: print("[audio]", end=""))

# set timeout value to bigger ones to avoid sdk cancel the request when GPT latency too high
speech_config.set_property(speechsdk.PropertyId.SpeechSynthesis_FrameTimeoutInterval, "100000000")
speech_config.set_property(speechsdk.PropertyId.SpeechSynthesis_RtfTimeoutThreshold, "10")

# create request with TextStream input type
tts_request = speechsdk.SpeechSynthesisRequest(input_type = speechsdk.SpeechSynthesisRequestInputType.TextStream)
tts_task = speech_synthesizer.speak_async(tts_request)

# Get GPT output stream
completion = client.chat.completions.create(
    model="gpt-4.1",
    messages=[
        {
            "role": "user",
            "content": "Who is the president of India currently?",
        },
    ],
    stream=True,
)

for chunk in completion:
    if len(chunk.choices) > 0:
        chunk_text = chunk.choices[0].delta.content
        if chunk_text:
            print(chunk_text, end="")
            tts_request.input_stream.write(chunk_text)
print("[GPT END]", end="")

# close tts input stream when GPT finished
tts_request.input_stream.close()

# wait all tts audio bytes return
result = tts_task.get()
print("[TTS END]", end="")


import wave
def save_queue_to_wav(audio_queue, filename="output.wav"):
    # Parameters for the WAV file
    # Assuming 16kHz, 16-bit, mono audio (same as your speech synthesizer)
    channels = 1
    sample_width = 2  # 16 bits = 2 bytes
    framerate = 16000
    
    # Create a new WAV file
    with wave.open(filename, 'wb') as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(framerate)
        
        # Write all audio data from the queue to the file
        audio_data = b''
        while not audio_queue.empty():
            audio_data += audio_queue.get()
        
        wav_file.writeframes(audio_data)
    
    print(f"Audio saved to {os.path.abspath(filename)}")

# Call the function to save the queue data
save_queue_to_wav(audio_queue)