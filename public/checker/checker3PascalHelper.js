const fs = require('fs');
const childProcess = require("child_process");
const compilers = require('../../config/compilers');
const path = require('path');

childProcess.exec('chcp 65001 | dir');

var pathToFolder = process.argv[2];
var fileName = process.argv[3];
var i = Number(process.argv[4]);

async function run(){

    input = fs.readFileSync(pathToFolder + '/input'+i+".txt",'utf8').trim();
    output = fs.readFileSync(pathToFolder + '/output'+i+".txt",'utf8').trim();

    var pOutput ='';
    var result ="Test #" + (i+1).toString() + "*" + "Wrong Answer" + "*" + "er" +"\n";

    var spawnProcess = childProcess.spawn(path.join(pathToFolder, fileName +'.exe'), [], {shell: false});
    //spawnProcess.stdout.setEncoding('utf8');

    spawnProcess.on('error', function (error) {
        fs.appendFileSync(pathToFolder + '/result.txt', "Test #" + (i+1).toString() + "*" + "Wrong Answer" + "*" + "er" +"\n",  function(error){ if(error) throw error;});
        spawnProcess.stdout.removeAllListeners();
        spawnProcess.stderr.removeAllListeners();
        process.exit()

    });

    spawnProcess.stdout.on('data', function (data){

        pOutput +=data.toString();

        if(pOutput.trim()==output){
            result = "Test #" + (i+1).toString() + "*" + "OK" + "*" + "ok" +"\n";
        }else{
            result = "Test #" + (i+1).toString() + "*" + "Wrong Answer" + "*" + "er" +"\n";
        }
    });
    spawnProcess.stderr.on('data', function (data) {
        fs.appendFileSync(pathToFolder + '/result.txt', "Test #" + (i+1).toString() + "*" + "Runtime error" + "*" + "er" +"\n",  function(error){ if(error) throw error;});
        spawnProcess.stdout.removeAllListeners();
        spawnProcess.stderr.removeAllListeners();
        process.exit()

    });

    spawnProcess.on('close', (code) => {
        fs.appendFileSync(pathToFolder + '/result.txt', result, function(error){ if(error) throw error;});
        spawnProcess.stdout.removeAllListeners();
        spawnProcess.stderr.removeAllListeners();
        process.exit()
    });

    spawnProcess.stdin.write(input);
    spawnProcess.stdin.end();

    setTimeout(() => {
        result = "Test #" + (i + 1).toString() + "*" + "Time limit exceeded" + "*" + "er" + "\n"
        fs.appendFileSync(pathToFolder + '/result.txt', result, function (error) { if (error) throw error; });
        spawnProcess.stdout.removeAllListeners();
        spawnProcess.stderr.removeAllListeners();
        spawnProcess.kill('SIGINT');
        process.exit()
    }, 1100 + compilers.pascal);
}

run()