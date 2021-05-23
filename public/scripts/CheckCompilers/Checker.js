const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

let max = (a, b)=>{if(a>b)return a;return b};
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let compilers = {
    "cpp": [path.join(__dirname, "cpp.exe"), ""],
    "java": ['java', [path.join(__dirname, "java.java")]],
    "pascal": [path.join(__dirname, "pascal.exe"), ""],
    "python": [path.join(__dirname, "..\\..\\checker\\pythonCompiler\\python.exe"), path.join(__dirname, "python.py")],
    "pypy": [path.join(__dirname, "..\\..\\checker\\pypyCompiler\\pypy3.exe"), path.join(__dirname, "python.py")],
}

async function run(Command) {
    let start = process.hrtime();
    let finish = 0;

    var spawnProcess = childProcess.spawn(Command[0], [Command[1]], {shell: false});

    spawnProcess.on('close', (code) => {
        spawnProcess.stdout.removeAllListeners();
        spawnProcess.stderr.removeAllListeners();
        finish = process.hrtime(start)[1];
    });
    if (Command[0] != 'java')
        await sleep(5000);
    else
        await sleep(10000);
    spawnProcess.kill('SIGINT');
    console.log(Command[0], finish/1000000);

    // await spawn(Command, [], { shell: false })
    return finish;
}

async function CheckTimes(key) {
    let aval = 0;
    let a;
    let averageTime = 0;
    console.log(key + " is testing..");
    let iterations = 10;
    let testsNumber = 20;
    for (let k = 0; k < iterations; k++) {
        a = []
        for (let j = 0; j < testsNumber; j++) {
            a.push(run(compilers[key]));
        }
        for (let j = 0; j < a.length; j++) {
            aval = await a[j];
            averageTime = max(averageTime, aval / 1000000);
        }
    }
    return parseInt(averageTime);
}

async function Todo() {
    let times = {}
    let a;
    let keys = Object.keys(compilers);
    for (let i = 0; i < keys.length; i++){
        try {
            await run(compilers[keys[i]]);
        } catch (err) {
            delete compilers[keys[i]]
        }
    }
    keys = Object.keys(compilers);
    for (let i = 0; i < keys.length; i++) {
        times[keys[i]] = await CheckTimes(keys[i]);
    }
    times = JSON.stringify(times);
    fs.writeFileSync(path.join(__dirname, "../../../config/compilers.js"), "module.exports = " + times);
    console.log("Done!");
    process.exit();
}
Todo();