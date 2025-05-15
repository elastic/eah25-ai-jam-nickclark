const net = require('net');

class NetworkModule {
    constructor() {
        this.client = null;
        this.onDataCallback = null;
        this.onErrorCallback = null;
        this.onCloseCallback = null;
        this.isConnected = false;
        this.buffer = '';
    }

    connect(host, port, onDataCallback, onErrorCallback, onCloseCallback) {
        this.onDataCallback = onDataCallback;
        this.onErrorCallback = onErrorCallback;
        this.onCloseCallback = onCloseCallback;

        this.client = new net.Socket();

        this.client.connect(port, host, () => {
            this.isConnected = true;
            console.log(`NetworkModule: Connected to ${host}:${port}`);
            // Optional: Call a specific onConnect callback if needed
        });

        this.client.on('data', (data) => {
            this.buffer += data.toString();
            let newlineIndex;
            while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
                const message = this.buffer.substring(0, newlineIndex).trim();
                this.buffer = this.buffer.substring(newlineIndex + 1);
                if (message && this.onDataCallback) {
                    this.onDataCallback(message);
                }
            }
        });

        this.client.on('error', (err) => {
            console.error('NetworkModule: Connection error:', err);
            this.isConnected = false;
            if (this.onErrorCallback) {
                this.onErrorCallback(err);
            }
        });

        this.client.on('close', () => {
            console.log('NetworkModule: Connection closed');
            this.isConnected = false;
            if (this.onCloseCallback) {
                this.onCloseCallback();
            }
            this.client = null; // Clean up the client
        });
    }

    sendCommand(commandString) {
        if (this.client && this.isConnected) {
            console.log(`NetworkModule: Sending command: ${commandString}`);
            this.client.write(`${commandString}\n`);
        } else {
            console.error('NetworkModule: Cannot send command, not connected.');
            if (this.onErrorCallback) {
                this.onErrorCallback(new Error('Cannot send command, not connected.'));
            }
        }
    }

    disconnect() {
        if (this.client) {
            this.client.destroy(); // Ensures the socket is closed
            this.client = null;
            this.isConnected = false;
        }
    }
}

module.exports = NetworkModule; 