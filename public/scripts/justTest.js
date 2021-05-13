const fs = require("fs");
const path = require('path');
const StreamZip = require('node-stream-zip');
const childProcess = require("child_process");

childProcess.exec('chcp 65001 | dir');



async function toDo(){
    let filepath = path.join(__dirname,'../tests/'+'1620857611206.zip')
    const zip = new StreamZip.async({ file: filepath });

    tests = []

    const entriesCount = await zip.entriesCount;


    for (let i=0; i<entriesCount/2;i++){
        let inp = await zip.entryData("input"+i+".txt");
        let out = await zip.entryData("output"+i+".txt");
        tests.push([inp.toString('utf8'),out.toString('utf8')])
    }

    await zip.close();

    console.log(tests)
}

toDo();

setTimeout(()=>{
    process.exit()
},10000)