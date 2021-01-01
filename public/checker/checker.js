const childProcess = require('child_process');
const fs = require('fs');

exports.parser = function (Task, programText, taskID){
    let idx = programText.toUpperCase().indexOf('BEGIN')
    if (idx == -1){
        // Parsing Error
        return [["Test #1 ", "Presentation Error" ,"er"]]// send log to HTML
    }
    // Parsing is OK
    var assignText='\nassign (input,\'public\\checker\\input.txt\'); reset(input);' +
    '\nassign (output,\'public\\checker\\output.txt\'); rewrite(output);'
    programText = programText.slice(0, idx+5) + assignText + programText.slice(idx+5)
    fs.writeFileSync(__dirname+'\\program.pas', programText, "utf8");
    return compiler(Task, taskID);
}

async function compiler(Task, taskID){

    // Try to compile
    try{
        childProcess.execSync(__dirname + '\\pascalCompiler\\pabcnetcclear.exe '+ __dirname +'\\program.pas');
    }catch{
        // Compilation Error
        return [["Test #1 ", "Compilation Error", "er"]]
    }
    
    // Get task from db
    var task =  await Task.findOne({identificator: taskID}).exec()
    var tests = task.tests

    // Starting Checking tests
    var result = [];
    for(var i = 1; i<=tests.length; i++){
        var test =  tests[i-1]
        fs.writeFileSync(__dirname+'\\input.txt', test[0], "utf8");

        childProcess.execSync('start ' + __dirname + '\\tlchecker.bat');
        if (fs.readFileSync(__dirname +"\\TLlog.txt").length != 0){
            // Time Limit
            result.push(["Test #" + i.toString() + " ", "Time Limit Exceeded", "er"]);
            return result;
        }

    
        let fileContent = fs.readFileSync(__dirname +"\\output.txt", "utf8").trim();

        if (fileContent.length == 0){
            // Something goes wrong during execution
            result.push(["Test #" + i.toString() + " ", "Runtime Error", "er"]) // or no output :)
            break
        }else if(fileContent != test[1].trim()){
            // Wrong answer
            result.push(["Test #" + i.toString() + " ", "Wrong Answer", "er"])
            break
        }
        result.push(["Test #" + i.toString() + " ", "OK", "ok"])
    }
    return result // send log to HTML
}