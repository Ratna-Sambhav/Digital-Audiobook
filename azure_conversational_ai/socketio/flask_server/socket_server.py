from gevent import monkey 
monkey.patch_all()

from flask import Flask, request
from flask_socketio import SocketIO, emit
import gevent
import time 

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

session_data = {}

@socketio.on("recieve")
def print_the_incoming(data):
    sid = request.sid
    print(str(data)) 
    k = 0
    session_data[sid] = True
    while True:
        if not session_data.get(sid, False):
            break 
        socketio.emit("sent", f"I guess someone sent me something, is that you?: {k}: {data}", to=sid)
        k = 1 if k==0 else 0
        time.sleep(0.04)

@socketio.on("stop")
def stop_stream(data):
    sid = request.sid
    print("stop event recieved")
    session_data[sid] = False

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)