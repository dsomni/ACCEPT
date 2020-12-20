var childProcess = require('child_process');
var path = childProcess.execSync('python.exe ' + __dirname + '\\parser.py').toString();

var fs = require('fs');
var metaStrings = fs.readFileSync(__dirname +"\\meta.txt", "utf8").split('\n');
var taskID = metaStrings[0];
var dir = 'public\\tasks\\task' + taskID
var infoStrings = fs.readFileSync(dir +"\\information.txt", "utf8").split('\n');
var numberOfTests = parseInt(infoStrings[2]);

if (path!="1"+String.fromCharCode(13,10)){
    try{
        var path = childProcess.execSync(__dirname + '/pascalCompiler/pabcnetcclear.exe '+ __dirname +'/program.pas').toString();
    }catch{
        console.log("Compilation Error")
        return
    }
    var result = '';
    for(var i = 1; i<=numberOfTests; i++){

        fs.writeFileSync(__dirname+'\\input.txt', fs.readFileSync(dir +"\\inputs\\" + i +".txt", "utf8"));

        var path = childProcess.execSync('start ' + __dirname + '\\program.exe').toString();
        //console.log('start ' + __dirname + '\\program.exe')
    
        let fileContent = fs.readFileSync(__dirname +"\\output.txt", "utf8").trim();

        if (fileContent.length == 0){
            result += "Runtime Error\n"
            break
        }else if(fileContent != fs.readFileSync(dir +"\\outputs\\" + i +".txt", "utf8").trim()){
            result += "Wrong Answer Test" + i + '\n';
            break
        }
        result += "OK\n"
    }
    console.log(result)

}else{
    console.log("Presentation Error");
}

