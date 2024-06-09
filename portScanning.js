const net = require('net');

const host = 'enter domain name or ip address';
const startPort = 1;
const endPort = 1024;

const portInfo = {};
let scannedPorts = 0;

const scan = async () => {
  for (let port = startPort; port <= endPort; port++) {
    const socket = new net.Socket();

    socket.setTimeout(1000);

    socket.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        portInfo[port] = { status: 'closed', reason: 'connection refused' };
      } else {
        portInfo[port] = { status: 'error', reason: err.message };
      }
      scannedPorts++;
      if (scannedPorts === endPort) {
        printResults();
      }
    });

    socket.on('timeout', () => {
      portInfo[port] = { status: 'closed', reason: 'timeout' };
      socket.destroy();
      scannedPorts++;
      if (scannedPorts === endPort) {
        printResults();
      }
    });

    socket.on('connect', () => {
      portInfo[port] = { status: 'open' };
      socket.destroy();

      // Try to identify the service if it's a common web port
      if (port === 80 || port === 443) {
        identifyService(port);
      } else {
        scannedPorts++;
        if (scannedPorts === endPort) {
          printResults();
        }
      }
    });

    socket.connect(port, host);
  }
};

const identifyService = async (port) => {
  const { default: fetch } = await import('node-fetch');
  try {
    const protocol = port === 443 ? 'https' : 'http';
    const response = await fetch(`${protocol}://${host}:${port}`, { method: 'HEAD', timeout: 5000 });

    if (response.ok) {
      portInfo[port].service = response.headers.get('server') || 'unknown service';
    } else {
      portInfo[port].service = 'unknown service';
    }
  } catch (error) {
    portInfo[port].service = 'unknown service';
  }

  scannedPorts++;
  if (scannedPorts === endPort) {
    printResults();
  }
};

const printResults = () => {
  console.log('Port scan results:');
  for (let port = startPort; port <= endPort; port++) {
    if (portInfo[port]) {
      const info = portInfo[port];
      console.log(`Port ${port}: ${info.status} (${info.reason || ''}${info.service ? `, service: ${info.service}` : ''})`);
    } else {
      console.log(`Port ${port}: not scanned`);
    }
  }
};

scan();
