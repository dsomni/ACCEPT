const fs = require('fs');
const childProcess = require("child_process");

childProcess.exec('chcp 65001 | dir');

var path = process.argv[2];
var fileName = process.argv[3];
var i = Number(process.argv[4]);

async function run(){

    input = fs.readFileSync(path + '\\input'+i+".txt",'utf8').trim();
    output = fs.readFileSync(path + '\\output'+i+".txt",'utf8').trim();

    var pOutput ='';
    var result ="Test #" + (i+1).toString() + "*" + "Wrong Answer" + "*" + "er" +"\n";

    var spawnProcess = childProcess.spawn('java', [path + '\\'+fileName+".java"], {shell: false});

    spawnProcess.on('error', function (error) {
        console.log(error);
        fs.appendFileSync(path + '\\result.txt', "Test #" + (i+1).toString() + "*" + "Wrong Answer" + "*" + "er" +"\n",  function(error){ if(error) throw error;});
        spawnProcess.stdout.removeAllListeners();
        spawnProcess.stderr.removeAllListeners();
        process.exit()

    });
    spawnProcess.stdout.on('data', function (data){

        pOutput +=data.toString('utf8');
        console.log(pOutput);
        if(pOutput.trim()==output){
            result = "Test #" + (i+1).toString() + "*" + "OK" + "*" + "ok" +"\n";
        }else{
            result = "Test #" + (i+1).toString() + "*" + "Wrong Answer" + "*" + "er" +"\n";
        }
    });
    spawnProcess.stderr.on('data', function (data) {
        console.log(data.toString())
        fs.appendFileSync(path + '\\result.txt', "Test #" + (i+1).toString() + "*" + "Runtime error" + "*" + "er" +"\n",  function(error){ if(error) throw error;});
        spawnProcess.stdout.removeAllListeners();
        spawnProcess.stderr.removeAllListeners();
        process.exit()

    });

    spawnProcess.on('close', (code) => {
        fs.appendFileSync(path + '\\result.txt', result, function(error){ if(error) throw error;});
        spawnProcess.stdout.removeAllListeners();
        spawnProcess.stderr.removeAllListeners();
        process.exit()
    });

    spawnProcess.stdin.write(input);
    spawnProcess.stdin.end();

    setTimeout(()=>{
        result = "Test #" + (i+1).toString() + "*" + "Time limit exceeded" + "*" + "er" +"\n"
        fs.appendFileSync(path + '\\result.txt', result, function(error){ if(error) throw error;});
        spawnProcess.stdout.removeAllListeners();
        spawnProcess.stderr.removeAllListeners();
        spawnProcess.kill('SIGINT');
        process.exit()
    },10100)
}
run()