// connect to websocket server

const { io } = require("socket.io-client");
const readline = require("readline");

const crypto = require("crypto");

const data = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });

const privatekey_pem = data.privateKey.export({ format: "pem", type: "pkcs1" });
const publickey_pem = data.publicKey.export({ format: "pem", type: "pkcs1" });

var users = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

var socket = io("ws://127.0.0.1:3000/", {
  query: { public_key: publickey_pem },
  transports: ["websocket"],
});

socket.connect();

const readInput = (msg = "") =>
  new Promise((resolve) => {
    rl.question(msg, (answer) => {
      resolve(answer);
    });
  });

function encryptText(plainText, publicKey) {
  return crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    // We convert the data string to a buffer
    Buffer.from(plainText)
  );
}

/**
 * @param {Buffer} encryptedBuffer
 * @returns {Buffer} decrypted buffer
 */
function decryptText(encryptedBuffer) {
  return crypto.privateDecrypt(
    {
      key: privatekey_pem,
      // In order to decrypt the data, we need to specify the
      // same hashing function and padding scheme that we used to
      // encrypt the data in the previous step
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    encryptedBuffer
  );
}

const getRecipientPublicKey = () => {
  return users.find((user) => user.id !== socket.id).public_key;
};

async function run() {
  while (true) {
    const input = await readInput();
    public_key = getRecipientPublicKey();
    const result = encryptText(input, public_key);
    socket.emit("message", result);
  }
}

socket.on("connect", () => {
  console.log("Connected with ID: ", socket.id);
  run();
});

socket.on("message", (msg) => {
  console.log("Guest: ", decryptText(msg).toString("utf8"));
});

socket.on("disconnect", (reason) => {
  console.log('Disconnected: ',reason)
  socket.close()
  rl.close()
});

socket.on("connect_error", (msg) => {
  console.log(msg)
  socket.close()
});

socket.on("public_key_exchange", (msg) => {
  users = JSON.parse(msg);
});
