let cellsize;
let cellNumberX;
let cellNumberY;
let blocks = [];
let pred = [];
let s;
let fins = [];
let difficult = 35;
let k = 0.005;
let player;
let dt = 0;
let nl = 0;
let radius = 11;
function setup(){
  cellsize=int(k*windowWidth);
  createCanvas(windowWidth-(windowWidth%cellsize)-3*cellsize, windowHeight-(windowHeight%cellsize)-3*cellsize);
  cellNumberX = width/cellsize
  cellNumberY = height/cellsize
  createCells();
  rememberPath();
  player = new Player(width, height, cellsize, radius);
  difficult+=0.5;
  difficult=min(difficult,65);
  k-=0.0005;
  k=max(0.005,k);
  if(dt!=0){
    nl = (dt+20)%1000
  }
  player.showBlocks(true);
}

function draw() {
  background(0)
  dt++;
  dt%=1000;
  drawCells(player.i, player.j, player.radius);
  player.show();
  nextLvl(dt)
}

function drawCells(x, y, radius){
  noStroke()
  for(let i = max(0, x-radius); i<min(x+radius, cellNumberX);i++){
    for(let j = max(0, y-radius); j<min(cellNumberY, y+radius);j++){
      blocks[i][j].show();
    }
  }
  blocks[cellNumberX-1][cellNumberY-1].show()
  blocks[0][cellNumberY-1].show()
  blocks[cellNumberX-1][0].show()
  blocks[0][0].show()
}
function keyPressed(){
  player.move(keyCode)
}
function rememberPath(){
  let fin;
  let x,y;
  for(let i = 0; i<fins.length; i++){
    fin = fins[i];
    x = fin[0];
    y = fin[1];
    while(pred[x][y]!=s){
      fin=pred[x][y];
      x = fin[0];
      y = fin[1];
      if(x==-1 && y==-1){
        break;
      }
      blocks[x][y].path = true
    }
  }
}
function showPath(){
  for(let i = 0;i<cellNumberX;i++){
    for(let j = 0;j<cellNumberY; j++){
      blocks[i][j].ShoworHidePath()
    }
  }
}
function nextLvl(dt){
  if(dt<nl){
    fill(255, 0, 0)
    textSize(width/15);
    textAlign(CENTER, CENTER);
    text('Next level', width/2, height/2)
  }else{
    nl = 0;
  }
}
function createCells(){
  blocks=[];
  for(let i = 0; i<cellNumberX; i++){
    blocks.push([]);
  }
  let legal =false;
  let snf = [[0,0],[0,cellNumberY-1],[cellNumberX-1,0],[cellNumberX-1,cellNumberY-1],[int(cellNumberX/2),int(cellNumberY/2)]];
  let r;
  let q;
  let v;
  let x,y,xi,yi;
  let ps;
  let lst;
  let visited=[];
  visited = [];
  pred=[];
  for(let i = 0; i<cellNumberX; i++){
      visited.push([]);
      pred.push([]);
  }
  for(let i = 0;i<cellNumberX;i++){
      for(let j = 0;j<cellNumberY;j++){
          r = random(100);
          blocks[i].push(new Block(i*cellsize, j*cellsize, cellsize,cellNumberX,cellNumberY, r<difficult))
          visited[i].push(false);
          pred[i].push([-1,-1]);
      }
  }
  blocks[snf[0][0]][snf[0][1]].solid = false;
  while(!legal){
      for(let k =0;k<5;k++){
          s = [snf[k][0],snf[k][1]];
          lst=[s,s,s,s,s];
          visited = [];
          pred=[];
          for(let i = 0; i<cellNumberX; i++){
              visited.push([]);
              pred.push([]);
          }
          q=[s];
          for(let i = 0;i<cellNumberX;i++){
              for(let j = 0;j<cellNumberY;j++){
                  visited[i].push(false);
                  pred[i].push([-1,-1]);
              }
          }
          visited[s[0]][s[1]]=true;
          while(q.length!=0){
              v=q.shift();
              x=v[0];
              y=v[1];
              ps = [[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
              for(let i = 0;i<4;i++){
                  xi=ps[i][0];
                  yi=ps[i][1];
                  if(xi<cellNumberX && xi>=0 && yi<cellNumberY && yi>=0 && !blocks[xi][yi].solid && !visited[xi][yi]){
                      visited[xi][yi]=true;
                      q.push([xi,yi]);
                      pred[xi][yi]=[x,y];

                  }
                  else if (xi<cellNumberX && xi>=0 && yi<cellNumberY && yi>=0 && blocks[xi][yi].solid){
                      lst.push([xi,yi]);
                      lst.shift();
                  }
              }
          }
          if(visited[int(cellNumberX/2)][int(cellNumberY/2)] && (visited[0][0] || visited[0][cellNumberY-1] || visited[cellNumberX-1][0] || visited[cellNumberX-1][cellNumberY-1])){
              legal=true;
              if(visited[0][0] ){
                  fins.push([0,0])
              }
              if(visited[0][cellNumberY-1] ){
                  fins.push([0,cellNumberY-1])
              }
              if(visited[cellNumberX-1][0] ){
                  fins.push([cellNumberX-1,0] )
              }
              if( visited[cellNumberX-1][cellNumberY-1] ){
                  fins.push( [cellNumberX-1,cellNumberY-1])
              }
              legal = true;
              break;
          }
          if(legal){
              break;
          }
          for(let i = 0;i<lst.length;i++){
              blocks[lst[i][0]][lst[i][1]].solid = false;
          }
      }
  }
  s = [int(cellNumberX/2),int(cellNumberY/2)];
  visited = [];
  pred=[];
  for(let i = 0; i<cellNumberX; i++){
      visited.push([]);
      pred.push([]);
  }
  q=[s];
  for(let i = 0;i<cellNumberX;i++){
      for(let j = 0;j<cellNumberY;j++){
          visited[i].push(false);
          pred[i].push([-1,-1]);
      }
  }
  visited[s[0]][s[1]]=true;
  while(q.length!=0){
      v=q.shift();
      x=v[0];
      y=v[1];
      ps = [[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
      for(let i = 0;i<4;i++){
          xi=ps[i][0];
          yi=ps[i][1];
          if(xi<cellNumberX && xi>=0 && yi<cellNumberY && yi>=0 && !blocks[xi][yi].solid && !visited[xi][yi]){
              visited[xi][yi]=true;
              q.push([xi,yi]);
              pred[xi][yi]=[x,y];
          }
      }
  }
  fins=[];
  if(visited[0][0] || visited[0][cellNumberY-1] || visited[cellNumberX-1][0] || visited[cellNumberX-1][cellNumberY-1]){
      if(visited[0][0] ){
          fins.push([0,0])
      }
      if(visited[0][cellNumberY-1] ){
          fins.push([0,cellNumberY-1])
      }
      if(visited[cellNumberX-1][0] ){
          fins.push([cellNumberX-1,0] )
      }
      if( visited[cellNumberX-1][cellNumberY-1] ){
          fins.push( [cellNumberX-1,cellNumberY-1])
      }
  }
  blocks[s[0]][s[1]].solid = false
}