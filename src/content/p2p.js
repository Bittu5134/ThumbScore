// content/p2p.js

let myPeerInstance = null;
let activePeerConnection = null;

function initializePeerClient(customUserId = null) {
  console.log("[RatioYT-P2P] Initializing PeerJS Client...");
  myPeerInstance = customUserId ? new Peer(customUserId) : new Peer();

  myPeerInstance.on("open", (id) => {
    console.log(`[RatioYT-P2P] Connected to signaling server. ID: ${id}`);
  });

  myPeerInstance.on("connection", (conn) => {
    activePeerConnection = conn;
    setupConnectionListeners(conn);
  });
}

function setupConnectionListeners(conn) {
  conn.on("data", (data) => {
    console.log("[RatioYT-P2P] Message received:", data);
    // Note: scoreDB will be populated via script.js importing or handling
  });
}

// EXPORTS: These are what script.js will be able to pull in
export function connectToFriend(friendPeerId) {
  if (!myPeerInstance) return;
  console.log(`[RatioYT-P2P] Connecting to: ${friendPeerId}`);
  const conn = myPeerInstance.connect(friendPeerId);
  activePeerConnection = conn;
  setupConnectionListeners(conn);
}

export function sendPeerData(payload) {
  if (activePeerConnection && activePeerConnection.open) {
    activePeerConnection.send(payload);
  } else {
    console.warn("[RatioYT-P2P] No active connection available to send data.");
  }
}

// Auto-boot up the peer server connection on module load
initializePeerClient();
