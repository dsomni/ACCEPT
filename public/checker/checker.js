const childProcess = require('child_process');
const fs = require('fs');

function parser(){
    var programText = fs.readFileSync(__dirname + '\\programText.txt',"utf8");
    let idx = programText.toUpperCase().indexOf('BEGIN')
    if (idx == -1){
        // Parsing Error
        return'Presentation Error'// send log to HTML
    }
    // Parsing is OK
    var assignText='\nassign (input,\'public\\checker\\input.txt\'); reset(input);' +
    '\nassign (output,\'public\\checker\\output.txt\'); rewrite(output);'
    programText = programText.slice(0, idx+5) + assignText + programText.slice(idx+5)
    fs.writeFileSync(__dirname+'\\program.pas', programText, "utf8");
    return compiler();
}

function compiler(){
    // Getting neccessary information
    var metaStrings = fs.readFileSync(__dirname +"\\meta.txt", "utf8").split('\n');
    var taskID = metaStrings[0];
    var taskDir = 'public\\tasks\\task' + taskID
    var infoStrings = fs.readFileSync(taskDir +"\\information.txt", "utf8").split('\n');
    var numberOfTests = parseInt(infoStrings[2]);

    // Try to compile
    try{
        childProcess.execSync(__dirname + '/pascalCompiler/pabcnetcclear.exe '+ __dirname +'/program.pas');
    }catch{
        // Compilation Error
        return "Compilation Error"
    }
    // Starting Checking tests
    var result = '';
    for(var i = 1; i<=numberOfTests; i++){

        fs.writeFileSync(__dirname+'\\input.txt', fs.readFileSync(taskDir +"\\inputs\\" + i +".txt", "utf8"));

        childProcess.execSync('start ' + __dirname + '\\program.exe');
    
        let fileContent = fs.readFileSync(__dirname +"\\output.txt", "utf8").trim();

        if (fileContent.length == 0){
            // Something goes wrong during execution
            result += "Runtime Error\n" // or no output :)
            break
        }else if(fileContent != fs.readFileSync(taskDir +"\\outputs\\" + i +".txt", "utf8").trim()){
            // Wrong answer
            result += "Wrong Answer Test" + i + '\n';
            break
        }
        result += "OK\n"
    }
    return result // send log to HTML
}

exports.checker = function (gettingText, taskID){
    fs.writeFileSync(__dirname + '\\programText.txt', gettingText) // saving program code
    fs.writeFileSync(__dirname + '\\meta.txt', taskID) // saving Task id
    var result = parser()
    return result;
}