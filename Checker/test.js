var childProcess = require('child_process');

var path = childProcess.execSync('python.exe parser.py').toString();
console.log(path)
if (path!="Error"+String.fromCharCode(13,10)){
    var path = childProcess.execSync('pascalCompiler\\pabcnetcclear.exe program.pas').toString();
    console.log(path)
    if (path=="OK"+String.fromCharCode(13,10)){
        var path = childProcess.execSync('start program.exe').toString();
    }
}

