exports.refactor = function(fs, configsPath, newConfig){
    let text = JSON.stringify(newConfig);
    let fin_text = "";
    let tabs = 0;
    let colon = false;
    let quote = false;
    let el;
    for (let i=0;i<text.length;i++){
        el = text[i];
        if(el=="{"){
            if(!quote){
                tabs+=1;
                colon = false;
            }
            fin_text+="{";
        }else if(el=="}"){
            if(!quote){
                tabs-=1;
                colon = false;
                fin_text += "\n";
                for(let j=0; j<tabs;j++)
                    fin_text += "\t";
            }
            fin_text += "}";
        }else if (el==":"){
            if(!quote){
                colon = true;
                fin_text+=": ";
            }else{
                fin_text+=":";
            }
        }else if (el==","){
            if (!quote)
                colon = false;
            fin_text+=",";
        }else if(el=="\'" || el=="\""){
            if(!quote && !colon){
                fin_text+="\n";
                for(let j=0; j<tabs;j++)
                    fin_text += "\t";
            }
            quote = !quote;
            if(colon)
                fin_text+="\"";
        }
        else
            fin_text+=el;
    }
    fs.writeFileSync(configsPath, "//please, names of fields HAVE TO BE UNIQUE!!!\n"+"module.exports = " + fin_text);
}

exports.refactor2  = function (fs, configsPath, json) {
    fs.writeFileSync(configsPath, "//please, names of fields HAVE TO BE UNIQUE!!!\n"+"module.exports = " +  JSON.stringify(json, null, "\t"));
}