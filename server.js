const SocketIO = require("socket.io");

// chat server
const io = new SocketIO.Server({ transports: ["websocket"] });

var users = [];

io.on("connection", (socket) => {
  console.log("New connection", socket.id);

  users.push({ id: socket.id, public_key: socket.handshake.query.public_key });

  if (users.length > 0) {
    io.emit("public_key_exchange", JSON.stringify(users));
  }

  socket.on("message", (msg) => {
    socket.broadcast.emit("message", msg);
  });

  socket.on("disconnect", () => {
    if (users.length > 0) {
      users = users.filter((user) => user.id !== socket.id);
    }
  });
});

io.listen(3000);
