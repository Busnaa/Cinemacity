const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

// Ukládáme stavy tlačítek – klíč ve formátu "section-index"
let buttonStates = {};

// Ukládáme položky programu (schedule)
let scheduleItems = [];

io.on("connection", (socket) => {
  console.log("Uživatel připojen");

  // Pošleme klientovi aktivní položky bufetu
  Object.keys(buttonStates).forEach(key => {
    const state = buttonStates[key];
    if (state.active) {
      let parts = key.split("-");
      socket.emit("updateToggle", { 
        section: parts[0], 
        index: parts[1], 
        active: true, 
        img: state.img, 
        activationTime: state.activationTime 
      });
    }
  });

  // Pošleme aktuální program (schedule)
  socket.emit("scheduleData", scheduleItems);

  // Zpracování události změny stavu tlačítka od admina
  socket.on("buttonToggled", (data) => {
    const key = data.section + "-" + data.index;
    if (data.active) {
      buttonStates[key] = { active: true, img: data.img, activationTime: Date.now() };
      data.activationTime = buttonStates[key].activationTime;
    } else {
      buttonStates[key] = { active: false, img: data.img };
    }
    io.emit("updateToggle", data);
  });

  socket.on("timerExpired", (data) => {
    const key = data.section + "-" + data.index;
    buttonStates[key] = { active: false, img: data.img };
    io.emit("updateToggle", { 
      section: data.section, 
      index: data.index, 
      active: false, 
      img: data.img 
    });
  });

  // Události pro správu programu (schedule)
  socket.on("scheduleAdd", (item) => {
    item.id = Date.now();
    scheduleItems.push(item);
    io.emit("scheduleData", scheduleItems);
  });

  socket.on("scheduleUpdate", (item) => {
    scheduleItems = scheduleItems.map(i => i.id === item.id ? item : i);
    io.emit("scheduleData", scheduleItems);
  });

  socket.on("scheduleDelete", (id) => {
    scheduleItems = scheduleItems.filter(i => i.id !== id);
    io.emit("scheduleData", scheduleItems);
  });

  // Nová událost pro vymazání celého programu
  socket.on("deleteAllSchedule", () => {
    scheduleItems = [];
    io.emit("scheduleData", scheduleItems);
  });
});

const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log("Server běží na portu " + port);
});
