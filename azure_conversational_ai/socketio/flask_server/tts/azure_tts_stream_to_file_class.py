import os
import queue
import wave
from openai import OpenAI
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv


class PushAudioOutputStreamCallback(speechsdk.audio.PushAudioOutputStreamCallback):
    """
    Callback mechanism to handle audio output streams for Azure's Text-to-Speech service.
    Captures synthesized audio data in real time and pushes it to a buffer.
    """
    def __init__(self, buffer, sample_rate):
        """
        Initialize the callback with a buffer and sample rate.
        
        Args:
            buffer: A queue where the audio stream data will be stored
            sample_rate: The sample rate of the audio stream
        """
        self.buffer = buffer
        self.sample_rate = sample_rate

    def write(self, audio_buffer: memoryview) -> int:
        """
        Write the audio buffer to the queue.
        
        Args:
            audio_buffer: The audio data as a memoryview
            
        Returns:
            The number of bytes written
        """
        self.buffer.put(audio_buffer.tobytes())
        return audio_buffer.nbytes


class TextToSpeechStreamer:
    """
    A class to handle real-time streaming of text to speech using OpenAI for text generation
    and Azure Cognitive Services for speech synthesis.
    """
    
    def __init__(self):
        """Initialize the TextToSpeechStreamer with default settings."""
        # Load environment variables
        load_dotenv()
        
        # Initialize the OpenAI client
        self.client = OpenAI()
        
        # Initialize queue for audio data
        self.audio_queue = queue.Queue()
        
        # Default settings
        self.voice_name = "en-US-BrianMultilingualNeural"
        self.sample_rate = 16000
        self.model = "gpt-4.1"
        self.output_filename = "output.wav"
        
        # Initialize speech configuration
        self._setup_speech_config()
    
    def _setup_speech_config(self):
        """Set up the Azure Speech configuration."""
        # Set up the speech configuration using Azure credentials
        self.speech_config = speechsdk.SpeechConfig(
            endpoint=f"wss://{os.getenv('AZURE_SERVICE_REGION')}.tts.speech.microsoft.com/cognitiveservices/websocket/v2",
            subscription=os.getenv("AZURE_SPEECH_KEY")
        )
        
        # Set the voice
        self.speech_config.speech_synthesis_voice_name = self.voice_name
        
        # Set timeout properties to handle high latency
        self.speech_config.set_property(
            speechsdk.PropertyId.SpeechSynthesis_FrameTimeoutInterval, 
            "100000000"
        )
        self.speech_config.set_property(
            speechsdk.PropertyId.SpeechSynthesis_RtfTimeoutThreshold, 
            "10"
        )
    
    def set_voice(self, voice_name):
        """
        Set the voice to use for speech synthesis.
        
        Args:
            voice_name: The name of the voice to use
        """
        self.voice_name = voice_name
        self.speech_config.speech_synthesis_voice_name = voice_name
    
    def set_model(self, model):
        """
        Set the OpenAI model to use.
        
        Args:
            model: The name of the model to use
        """
        self.model = model
    
    def set_output_filename(self, filename):
        """
        Set the output filename for the generated WAV file.
        
        Args:
            filename: The filename to use
        """
        self.output_filename = filename
    
    def process_prompt(self, prompt):
        """
        Process a user prompt by generating text with OpenAI and
        converting it to speech with Azure.
        
        Args:
            prompt: The user prompt to process
        """
        # Set up the audio output stream
        stream_callback = PushAudioOutputStreamCallback(self.audio_queue, self.sample_rate)
        stream = speechsdk.audio.PushAudioOutputStream(stream_callback)
        audio_config = speechsdk.audio.AudioOutputConfig(stream=stream)
        
        # Create the speech synthesizer
        speech_synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=self.speech_config, 
            audio_config=audio_config
        )
        
        # Add callback for synthesizing events (optional for progress monitoring)
        speech_synthesizer.synthesizing.connect(lambda evt: print("[audio]", end=""))
        
        # Create a TTS request with TextStream input type
        tts_request = speechsdk.SpeechSynthesisRequest(
            input_type=speechsdk.SpeechSynthesisRequestInputType.TextStream
        )
        tts_task = speech_synthesizer.speak_async(tts_request)
        
        # Generate text using OpenAI
        completion = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            stream=True,
        )
        
        # Process the streaming completion and send to TTS
        for chunk in completion:
            if len(chunk.choices) > 0:
                chunk_text = chunk.choices[0].delta.content
                if chunk_text:
                    print(chunk_text, end="")
                    tts_request.input_stream.write(chunk_text)
        print("[GPT END]", end="")
        
        # Close the TTS input stream when GPT has finished
        tts_request.input_stream.close()
        
        # Wait for all TTS audio bytes to return
        result = tts_task.get()
        print("[TTS END]", end="")
        
        # Return the result for potential further processing
        return result
    
    def save_audio(self, filename=None):
        """
        Save the audio data from the queue to a WAV file.
        
        Args:
            filename: Optional filename override, otherwise uses self.output_filename
        """
        if filename is None:
            filename = self.output_filename
            
        # Parameters for the WAV file
        channels = 1
        sample_width = 2  # 16 bits = 2 bytes
        framerate = self.sample_rate
        
        # Create a new WAV file
        with wave.open(filename, 'wb') as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(sample_width)
            wav_file.setframerate(framerate)
            
            # Write all audio data from the queue to the file
            audio_data = b''
            while not self.audio_queue.empty():
                audio_data += self.audio_queue.get()
            
            wav_file.writeframes(audio_data)
        
        print(f"Audio saved to {os.path.abspath(filename)}")


if __name__ == "__main__":
    # Create an instance of the TextToSpeechStreamer
    streamer = TextToSpeechStreamer()
    
    # Get user input
    user_prompt = input("Enter your prompt for the AI: ")
    
    # Optionally configure streamer settings
    output_file = input("Enter output filename (default: output.wav): ")
    if output_file:
        streamer.set_output_filename(output_file)
    
    voice = input("Enter voice name (default: en-US-BrianMultilingualNeural): ")
    if voice:
        streamer.set_voice(voice)
    
    model = input("Enter OpenAI model (default: gpt-4.1): ")
    if model:
        streamer.set_model(model)
    
    # Process the prompt
    streamer.process_prompt(user_prompt)
    
    # Save the audio
    streamer.save_audio()