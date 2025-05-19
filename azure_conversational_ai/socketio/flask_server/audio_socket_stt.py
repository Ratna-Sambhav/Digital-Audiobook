from gevent import monkey
monkey.patch_all()

from flask import Flask, render_template, request
import azure.cognitiveservices.speech as speechsdk
import os
from flask_socketio import SocketIO
import logging
import base64
import numpy as np
from dotenv import load_dotenv
import os
load_dotenv()

speech_key = os.getenv("AZURE_SPEECH_KEY")
service_region = os.getenv("AZURE_SERVICE_REGION")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
# Using gevent as our async mode
socketio = SocketIO(app, async_mode='gevent', cors_allowed_origins="*", 
                    logger=True, engineio_logger=True)

# Global objects for the recognizer and push stream
user_info = {}

def setup_speech_recognizer(sid):
    
    # Verify credentials
    if not speech_key or not service_region:
        error_msg = "Missing Azure Speech credentials. Check AZURE_SPEECH_KEY and AZURE_SERVICE_REGION environment variables."
        logging.error(error_msg)
        socketio.emit('transcription', {'text': error_msg, 'error': True})
        return None
        
    logging.info(f"Setting up speech recognizer for region: {service_region}")
    
    # Configure the Azure Speech SDK with your credentials
    speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
    speech_config.speech_recognition_language = "en-US"
    
    # Create push stream with EXPLICIT format (PCM 16kHz, 16-bit, mono)
    format = speechsdk.audio.AudioStreamFormat(samples_per_second=16000,
                                              bits_per_sample=16,
                                              channels=1)
    user_info[sid]["push_stream"] = speechsdk.audio.PushAudioInputStream(stream_format=format)
    audio_config = speechsdk.audio.AudioConfig(stream=user_info[sid]["push_stream"])
    
    # Create the recognizer using the push stream as the audio input
    speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

    # Handler for interim recognition results (while speaking)
    def handle_interim_result(evt):
        text = evt.result.text
        logging.info(f"Recognizing: {text}")
        socketio.emit('interim_transcription', {'text': text})
    
    # Handler for final recognized results
    def handle_final_result(evt):
        if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
            text = evt.result.text
            logging.info(f"Recognized: {text}")
            user_info[sid]["query"] += text
            logging.info(f"********************* {user_info[sid]['query']} ******************")
            socketio.emit('transcription', {'text': text})
        elif evt.result.reason == speechsdk.ResultReason.NoMatch:
            logging.info("No speech could be recognized")
            socketio.emit('transcription', {'text': "No speech could be recognized"})
        elif evt.result.reason == speechsdk.ResultReason.Canceled:
            cancellation_details = evt.result.cancellation_details
            logging.info(f"Speech Recognition canceled: {cancellation_details.reason}")
            if cancellation_details.reason == speechsdk.CancellationReason.Error:
                logging.error(f"Error details: {cancellation_details.error_details}")
            socketio.emit('transcription', {'text': f"Speech Recognition canceled: {cancellation_details.reason}"})

    def session_started(evt):
        logging.info(f"Session started: {evt}")
        user_info[sid]['status'] = 1
        socketio.emit('debug', {'message': 'Speech session started'})
        
    def session_stopped(evt):
        logging.info(f"Session stopped: {evt}")
        user_info[sid]['status'] = 0
        socketio.emit('debug', {'message': 'Speech session stopped'})
        
    def canceled(evt):
        error_msg = f"Recognition canceled: {evt.cancellation_details.reason}. Error details: {evt.cancellation_details.error_details}"
        logging.error(error_msg)
        socketio.emit('transcription', {'text': error_msg, 'error': True})

    def speech_start_detected(evt):
        logging.info("Speech start detected")
        socketio.emit('debug', {'message': 'Speech detected, listening...'})

    # Connect recognition event handlers
    speech_recognizer.recognizing.connect(handle_interim_result)
    speech_recognizer.recognized.connect(handle_final_result)
    speech_recognizer.session_started.connect(session_started)
    speech_recognizer.session_stopped.connect(session_stopped)
    speech_recognizer.canceled.connect(canceled)
    speech_recognizer.speech_start_detected.connect(speech_start_detected)

    # Start recognition asynchronously
    speech_recognizer.start_continuous_recognition_async()
    logging.info("Started continuous recognition with push stream")

    return speech_recognizer


@socketio.on('connect')
def handle_connect():
    sid = request.sid
    user_info[sid] = {"recognizer": None, "push_stream": None, "query": ''}
    logging.info('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    user_info.pop(sid)
    logging.info('Client disconnected')
    # Clean up resources on disconnect to avoid orphaned connections
    handle_stop_transcription()

@socketio.on('disconnect')
def handle_disconnect(reason=None):
    sid = request.sid
    logging.info(f'Client disconnected: {reason}')
    
    if sid in user_info:
        # Clean up resources directly here
        try:                    
            # Now remove the user data
            user_info.pop(sid)
            
        except Exception as e:
            logging.error(f"Error during disconnect cleanup: {str(e)}")

@socketio.on('start_transcription')
def handle_start_transcription():
    sid = request.sid

    logging.info("Received start_transcription event")
    # If there's an existing recognizer, stop it before starting a new one
    if user_info[sid]["recognizer"]:
        try:
            user_info[sid]["recognizer"].stop_continuous_recognition_async()
        except Exception as e:
            logging.error(f"Error stopping existing recognizer: {str(e)}")
        user_info[sid]["recognizer"] = None
        
    if user_info[sid]["push_stream"]:
        try:
            user_info[sid]["push_stream"].close()
        except Exception as e:
            logging.error(f"Error closing existing push stream: {str(e)}")
        user_info[sid]["push_stream"] = None
        
    user_info[sid]["recognizer"] = setup_speech_recognizer(sid)
    socketio.emit('transcription', {'text': 'Transcription started. Speak now...'})

@socketio.on('audio_data')
def handle_audio_data(data):
    sid = request.sid
    
    if not user_info[sid]["push_stream"]:
        logging.error("Push stream is not initialized")
        return
    
    if not user_info[sid]["recognizer"]:
        logging.error("Recognizer is not initialized")
        return
        
    try:
        # Get PCM audio data from client
        audio_data = data.get('audio')
        if not audio_data:
            logging.error("No audio data found in the payload")
            return
        
        # Convert base64 to binary
        audio_binary = base64.b64decode(audio_data)
        
        # We expect this to be raw PCM data (16-bit, 16kHz, mono)
        # Write directly to the push stream
        try:
            user_info[sid]["push_stream"].write(audio_binary)
            # No need to call flush() - the Speech SDK handles buffering internally
        except Exception as stream_error:
            logging.error(f"Stream write error: {str(stream_error)}")
            socketio.emit('transcription', {'text': f'Audio stream error: {str(stream_error)}', 'error': True})
            
    except Exception as e:
        logging.error(f"Error processing audio data: {str(e)}")
        logging.exception("Full stack trace:")

@socketio.on('stop_transcription')
def handle_stop_transcription():
    sid = request.sid
    
    if sid not in user_info:
        logging.warning(f"stop_transcription: User {sid} not found in user_info")
        return
        
    logging.info("Received stop_transcription event")
    try:
        if user_info[sid]["recognizer"]:
            try:
                user_info[sid]["recognizer"].stop_continuous_recognition_async()
                logging.info("Recognition stopped")
            except Exception as recog_error:
                logging.error(f"Error stopping recognition: {str(recog_error)}")
            finally:
                user_info[sid]["recognizer"] = None
                
        if user_info[sid]["push_stream"]:
            try:
                user_info[sid]["push_stream"].close()
                logging.info("Push stream closed")
            except Exception as stream_error:
                logging.error(f"Error closing push stream: {str(stream_error)}")
            finally:
                user_info[sid]["push_stream"] = None
                
        socketio.emit('transcription', {'text': 'Transcription stopped.'})
        
    except Exception as e:
        logging.error(f"Error in stop_transcription: {str(e)}")
        logging.exception("Full stack trace:")

# For Azure App Service, expose the application as "application"
application = app

if __name__ == '__main__':
    # This code only runs when executing the script directly (not on App Service)
    logging.info("Starting Flask app in local development mode")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)