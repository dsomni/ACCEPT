const config = require('../../../config/configs');
const fs = require("fs");

const logs = "../../logs/"

let files = fs.readdirSync(logs);
for (let i = 0; i < files.length; i++){
  if (Date.now() - fs.statSync(logs + files[i]).birthtimeMs > config.logsLifeTime * 24 * 60 * 60 * 1000){
    fs.rmSync(logs + files[i]);
  }
}