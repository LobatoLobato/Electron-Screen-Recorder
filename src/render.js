const remote = require("@electron/remote");
const { ipcRenderer } = require("electron");
const desktopCapturer = {
  getSources: (opts) =>
    ipcRenderer.invoke("DESKTOP_CAPTURER_GET_SOURCES", opts),
};

const appCloseBtn = document.getElementById("appCloseBtn");
appCloseBtn.onclick = () => {
  ipcRenderer.send("close");
};
const appMinimizeBtn = document.getElementById("appMinimizeBtn");
appMinimizeBtn.onclick = () => {
  ipcRenderer.send("minimize");
};
const errorBox = {
  element: document.getElementById("errorBox"),
  button: document.getElementById("errorBox").querySelector("button"),
  hide: () => {
    errorBox.element.style.display = "none";
  },
  show: (text) => {
    errorBox.element.querySelector("p").innerHTML = text;
    errorBox.element.style.display = "flex";
  },
};
errorBox.button.onclick = () => errorBox.hide();

const videoInfo = {
  elapsedTime: document.getElementById("elapsedTime"),
  editBtn: document.getElementById("editBtn"),
  format: document.getElementById("videoFormat"),
  exportBtn: document.getElementById("exportBtn"),
};
const videoElement = document.querySelector("video");
const videoSourceName = document.getElementById("videoSourceName");
const videoSelectBtn = document.getElementById("videoSelectBtn");
videoSelectBtn.onclick = getVideoSources;

const startBtn = document.getElementById("startBtn");
startBtn.onclick = startRecording;

const stopBtn = document.getElementById("stopBtn");
stopBtn.onclick = stopRecording;

let mediaRecorder;

const stopWatch = new StopWatch();
const timeLimit = 86400000;
function startRecording() {
  if (!mediaRecorder || mediaRecorder.state === "recording") {
    errorBox.show("No source selected");
    return;
  }
  errorBox.hide();

  mediaRecorder.start();

  startBtn.style.backgroundColor = "#CC0000";
  startBtn.innerText = "Recording";

  stopWatch.start(
    (time) => {
      videoInfo.elapsedTime.innerText = time;
    },
    timeLimit,
    () => {
      stopRecording();
      errorBox.show("Time limit exceeded");
    }
  );

  videoInfo.exportBtn.style.opacity = 0.7;
  videoInfo.exportBtn.style.backgroundColor = "#550000";
  videoInfo.exportBtn.style.cursor = "default";
  videoInfo.exportBtn.onclick = () => console.log("");
}
function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    errorBox.show("No active recording");
    return;
  }
  errorBox.hide();

  mediaRecorder.stop();

  startBtn.style.backgroundColor = "#ffed4e";
  startBtn.innerText = "Start";

  stopWatch.stop();
}

const { Menu } = remote;
async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    types: ["window", "screen"],
  });

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map((source) => {
      return {
        label: source.name,
        click: () => selectSource(source),
      };
    })
  );

  videoOptionsMenu.popup();
}

async function selectSource(source) {
  videoSourceName.innerText = source.name;

  const constraints = {
    frameRate: { min: 24, ideal: 60, max: 60 },
    audio: {
      mandatory: {
        chromeMediaSource: "desktop",
      },
    },
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: source.id,
      },
    },
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoElement.volume = 0;
  videoElement.srcObject = stream;
  videoElement.play();

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: "video/webm; codecs=h264",
  });
  mediaRecorder.ondataavailable = handleDataAvailable;
}

const { dialog } = remote;
const { writeFile, rm, mkdir } = require("fs");
const ffmpeg = require("./ffmpeg");

async function handleDataAvailable(e) {
  console.log("video data available");

  const blob = new Blob([e.data], { type: "video/webm; codecs=h264" });
  const buffer = Buffer.from(await blob.arrayBuffer());

  // videoInfo.editBtn.onclick = () => {
  //   const tempFolder = `${process.cwd()}\\temp`;
  //   const tempFilePath = `${tempFolder}\\temp.webm`;
  //   const outputFilePath = `${tempFolder}\\out.webm`;
  //   console.log(tempFolder);
  //   mkdir(tempFolder, () => {
  //     writeFile(tempFilePath, buffer, () => {
  //       const process = ffmpeg().input(tempFilePath);

  //       process.setStartTime(stopWatch.ms / 2000);

  //       process.save(outputFilePath);
  //       console.log("Editing file");
  //     });
  //   });
  // };

  videoInfo.exportBtn.style.opacity = 1;
  videoInfo.exportBtn.style.cursor = "pointer";
  videoInfo.exportBtn.style.backgroundColor = "#57DD42";
  videoInfo.exportBtn.onclick = async () => {
    const { filePath } = await dialog.showSaveDialog({
      buttonLabel: "Save video",
      defaultPath: `teste.${videoInfo.format.value}`, //`vid-${Date.now()}.webm`,
    });
    console.log(filePath);

    if (filePath) {
      const inputPath = filePath.replace(videoInfo.format.value, "webm");
      const outputPath = filePath;
      writeFile(inputPath, buffer, async () => {
        if (videoInfo.format.value === "webm") {
          return;
        }
        ffmpeg()
          .input(inputPath)
          .save(outputPath)
          .on("end", () => {
            rm(inputPath, () => {
              console.log("video saved successfully!");
            });
          });
      });
    }
  };
}
