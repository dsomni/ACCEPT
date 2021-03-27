const mongoose = require('mongoose');
const config = require('../../config/configs');
const path = require('path')
var xl = require('excel4node');

var connectionString
if (config.mongodbConfigs.User.Username != "" && config.mongodbConfigs.User.Password != "") {
    connectionString = "mongodb://" + config.mongodbConfigs.User.Username + ":" + config.mongodbConfigs.User.Password + "@" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
} else {
    connectionString = "mongodb://" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
}

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const Tournament = require('../../config/models/Tournament');

var identificator = process.argv[2];


async function run() {
    tournament = await Tournament.findOne({ identificator: identificator });

    results = tournament.results;

    results.sort((a, b) => {return b.sumscore - a.sumscore;});


    let realresults = []

    for (let i = 0; i <results.length; i++){
        realresults.push([results[i].login])
        for (let j = 0; j < results[i].tasks.length; j++){
            realresults[i].push([
                {
                    bold: true,
                    size: 14,
                },
                results[i].tasks[j].score.toString(),
                {
                    bold: false,
                    size: 12,
                },
                "(" + results[i].tasks[j].tries.toString() +
                ")"
            ]);
        }
        realresults[i].push(results[i].sumscore.toString());
        realresults[i].push(results[i].sumtime.toString());
    }

    let wb = new xl.Workbook();
    let ws = wb.addWorksheet(tournament.title);
    let tasks = tournament.tasks;


    ws.cell(1, 1).string("LOGIN").style({ font: { bold: true } });
    for (let i = 0; i < tasks.length; i++) {
        ws.cell(1, i + 2).string((i + 1).toString() + " " + tasks[i].title).style({ font: { bold: true } });
    }
    ws.cell(1, tasks.length+2).string("SCORE").style({font:{ bold: true }});
    ws.cell(1, tasks.length + 3).string("TIME").style({ font: { bold: true } });
    for (let i = 0; i < realresults.length; i++) {
        for (let j = 0; j < realresults[0].length; j++) {
            if(j==realresults[0].length-2){
                ws.cell(i + 2, j + 1).string(realresults[i][j]).style({font:{ bold: true }});
            }else{
                ws.cell(i + 2, j + 1).string(realresults[i][j]);
            }
        }
    }
    var rightNow = new Date();
    rightNow = new Date(rightNow.valueOf()+1000*60*60*3); // +3
    //console.log(rightNow);
    var res = rightNow.toISOString().slice(0,10).replace(/-/g,".");
    wb.write(path.join(__dirname + "/../tables/"+tournament.title + " Results_" + res + ".xlsx"));


}


run();

setTimeout(() => {
    process.exit();
}, 1000 * 10)