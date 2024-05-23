let net = require("net")


function run() {
  let server = new net.createServer((connection) => {
    console.log("client connected");
    connection.on("data", (data) => {
      console.log("recv client data:", data);
      connection.write(data.toString())
    })
  })
  server.listen(33445, () => {
    console.log("server is listening...")
  })
}

run();