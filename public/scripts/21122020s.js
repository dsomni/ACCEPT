
let cellsize;
let cellNumberX;
let cellNumberY;
let blocks = [];
let pred = [];
let s;
let fins = [];
let difficult = 500;
let k = 0.006;
//let k = 0.01;

let player;
function setup() {
  cellsize=int(k*windowWidth);
  createCanvas(windowWidth-(windowWidth%cellsize)-2*cellsize, windowHeight-(windowHeight%cellsize)-cellsize);
  cellNumberX = width/cellsize
  cellNumberY = height/cellsize
  blocks=[];
  for(let i = 0; i<cellNumberX; i++){
    blocks.push([]);
  }
  createCells();
  player = new Player(width, height, cellsize, blocks);
  difficult+=5;
  difficult=min(difficult,500);
  k-=0.0005;
  k=max(0.004,k);
}

function draw() {
  drawCells();
  if(player.showSolution){
    showPath();
  }
  player.show();
 
}

function drawCells(){
  // stroke(0, 100);
  noStroke()
  for(let i = 0; i<cellNumberX;i++){
    for(let j = 0; j<cellNumberY;j++){
      blocks[i][j].show();
    }
  }
}
function keyPressed(){
  player.move(key)
}

function showPath(){
  let fin;
  let x,y;
  console.log(fins.length);
  for(let i = 0; i<fins.length; i++){
    fin = fins[i];
    x = fin[0];
    y = fin[1];
    while(pred[x][y]!=s){
      fin=pred[x][y];
      x = fin[0];
      y = fin[1];
      stroke(0,0,255);
      circle(x*cellsize+int(cellsize/2), y*cellsize+int(cellsize/2),cellsize/4);
      noStroke()
      if(x==-1 && y==-1){
        break;
      }
    }
  }
}

function createCells(){
  console.log(1)
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
      r = random(1000);
      blocks[i].push(new Block(i*cellsize, j*cellsize, cellsize,cellNumberX,cellNumberY, r<difficult))
      visited[i].push(false);
      pred[i].push([-1,-1]);
    }
  }
  //drawCells();
  blocks[snf[0][0]][snf[0][1]].solid = false;
  while(!legal){
    console.log(1)
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
          console.log(1)
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

}