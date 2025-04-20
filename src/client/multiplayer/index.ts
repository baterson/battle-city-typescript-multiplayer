export function createConnection() {
  const socket = new WebSocket("ws://localhost:8080?roomId=");

  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => {
      console.log("🟢 Connected to ws://localhost:8080");
      resolve(socket);
    });
  });
}
