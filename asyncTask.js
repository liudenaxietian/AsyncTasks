var net = require('net');

//
class CommandFeedbackMaster {
  #buf;
  #pause;
  #pauseResolve;
  constructor() {
    this.#buf = {};
    this.#pause = false;
    this.#pauseResolve = null;
  }

  Register(task) {
    let pausePromise = new Promise((resolve) => {
      if (!this.#pause) {
        resolve();
      } else {
        this.#pauseResolve = resolve;
      }
    });
    pausePromise.then(() => {
      this.#RegisterCore(task);
    });
    return pausePromise;
  }

  #RegisterCore(task) {
    this.#buf[task.Command()] = task;

    // 指令超时处理
    setTimeout(() => {
      let dstCmd = this.#buf[task.Command()];
      if (dstCmd === undefined) {
        return;
      }
      delete this.#buf[cmd];

      dstCmd.Reject();
    }, task.Timeout());
  }

  Listen(cmd) {
    let dstCmd = this.#buf[cmd];
    if (dstCmd === undefined) {
      return;
    }
    delete this.#buf[cmd];

    dstCmd.Go(cmd); // 假装有命令结果判断
  }

  Pause() {
    this.#pause = true;
  }

  Continue() {
    this.#pause = false;
    if (this.#pauseResolve) {
      this.#pauseResolve();
    }
  }
};
var commandFeedbackMaster = new CommandFeedbackMaster();

//
class MyTask {
  #io;
  #cmd;
  #timeout;
  #resolve;
  #reject;
  constructor(io, cmd, timeout = 10000) {
    this.#io = io;
    this.#cmd = cmd;
    this.#timeout = timeout;
  }

  Command() {
    return this.#cmd;
  }

  Timeout() {
    return this.#timeout;
  }

  async Run() {
    await commandFeedbackMaster.Register(this);

    console.log(`send: ${this.#cmd}`)
    this.#io.write(this.#cmd);

    return new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });
  }

  Go(cmd) {
    if (cmd === this.#cmd
      //&& cmd !== "step 3" //假装这里是一个异常
    ) {
      this.#resolve();
    } else {
      this.#reject();
    }
  }

  Reject() {
    this.#reject();
  }
}


async function work(client) {
  const step1 = new MyTask(client, 'step 1', 3000);
  const step2 = new MyTask(client, "step 2", 3000);
  const step3 = new MyTask(client, "step 3", 3000);
  const step4 = new MyTask(client, "step 4", 3000);
  const step5 = new MyTask(client, "step 5", 3000);

  try {
    console.log("start work");
    await step1.Run();
    await step2.Run();

    console.log("pause work");
    commandFeedbackMaster.Pause();
    setTimeout(() => {
      console.log("continue work")
      commandFeedbackMaster.Continue();
    }, 10000);

    await step3.Run();
    await step4.Run();
    await step5.Run();

  } catch (err) {
    console.log("err:", err);
  } finally {
    console.log("work complete");
  }
}



function run() {
  let client = new net.Socket();
  client.connect(33445, '127.0.0.1', () => {
    console.log("successed to link\n");
    work(client);
  })

  client.on("data", (data) => {
    const cmd = data.toString();
    console.log("recv:" + cmd);
    commandFeedbackMaster.Listen(cmd);
  })
}



run();