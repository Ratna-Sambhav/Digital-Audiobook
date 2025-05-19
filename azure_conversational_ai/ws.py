import asyncio
import websockets

async def interact_with_server(uri: str):
    try:
        # Connect to the WebSocket server
        async with websockets.connect(uri) as websocket:
            print("Connected to the server.")

            # Continuously send and receive data
            while True:
                # Get input from the user
                user_input = input("Enter your message (type 'exit' to quit): ")
                if user_input.lower() == 'exit':
                    print("Exiting...")
                    break

                # Send the input to the WebSocket server
                await websocket.send(user_input)
                print(f"Sent: {user_input}")

                # Receive and print the server's streamed response
                print("Receiving response:")
                while True:
                    try:
                        # Receive a chunk of the response
                        response = await websocket.recv()
                        print(response, end='', flush=True)
                    except websockets.exceptions.ConnectionClosedOK:
                        # Server closed the connection properly
                        print("\nConnection closed by the server.")
                        return
                    except websockets.exceptions.ConnectionClosedError as e:
                        print(f"\nConnection error: {e}")
                        return
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # The WebSocket server URL
    server_uri = "wss://b9c2-20-84-75-21.ngrok-free.app/ws"
    
    # Run the client
    asyncio.run(interact_with_server(server_uri))
