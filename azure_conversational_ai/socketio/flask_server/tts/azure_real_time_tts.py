import os
from openai import OpenAI
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv 

load_dotenv()

# setup AzureOpenAI client
client = OpenAI()

# setup speech synthesizer
# IMPORTANT: MUST use the websocket v2 endpoint
speech_config = speechsdk.SpeechConfig(endpoint=f"wss://{os.getenv('AZURE_SERVICE_REGION')}.tts.speech.microsoft.com/cognitiveservices/websocket/v2",
                                       subscription=os.getenv("AZURE_SPEECH_KEY"))
# set a voice name
speech_config.speech_synthesis_voice_name = "en-US-BrianMultilingualNeural"
speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)

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
            "content": "What is the reason behind existence of the world based on German philospher Neitshze",
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