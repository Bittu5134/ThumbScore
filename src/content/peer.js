import { Peer } from "peerjs";


export function peerInit(data) {
    console.log("this is a peer!", data);
    var peer = new Peer();
    peer.on("open", function (id) {
      console.log("My peer ID is: " + id);
    });
    
}

