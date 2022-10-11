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
    errorBox.show("No recording active");
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
const { writeFile } = require("fs");
async function handleDataAvailable(e) {
  console.log("video data available");

  const blob = new Blob([e.data], { type: "video/webm; codecs=h264" });
  const buffer = Buffer.from(await blob.arrayBuffer());

  videoInfo.exportBtn.style.opacity = 1;
  videoInfo.exportBtn.style.cursor = "pointer";
  videoInfo.exportBtn.style.backgroundColor = "#57DD42";
  videoInfo.exportBtn.onclick = async () => {
    const { filePath } = await dialog.showSaveDialog({
      buttonLabel: "Save video",
      defaultPath: `vid-${Date.now()}.webm`,
    });
    console.log(filePath);
    if (filePath) {
      writeFile(filePath, buffer, () =>
        console.log("video saved successfully!")
      );
    }
  };
}
