function div(a, b){
    return Math.floor(a/b);
}
class Player{
    constructor(width, height, cellsize, radius = 10){
        this.cellNumberX = width/cellsize;
        this.cellNumberY = height/cellsize;
        this.cellsize = cellsize;
        this.x=int(cellNumberX/2)*cellsize
        this.y=int(cellNumberY/2)*cellsize
        this.i=int(cellNumberX/2)
        this.j=int(cellNumberY/2)
        this.showSolution = false;
        this.radius = radius
    }
    show(){
        fill(65);
        rect(this.x, this.y, this.cellsize);
        fill(0);
    }
    move(dir){
        this.showBlocks(false);
        if (dir==80){
            showPath()
        }
        if (dir == 87){
            if(this.j-1>=0 && !blocks[this.i][this.j-1].solid){
                this.y -= (this.cellsize);
                this.j--;
            }
        }
        if(dir == 83){
            if(this.j+1<cellNumberY && !blocks[this.i][this.j+1].solid){
                this.y += (this.cellsize);
                this.j++;
            }
        }
        if(dir == 65){
            if(this.i-1>=0 && !blocks[this.i-1][this.j].solid){
                this.x -= (this.cellsize);
                this.i--;
            }
        }
        if(dir == 68){
            if(this.i+1<cellNumberX && !blocks[this.i+1][this.j].solid){
                this.x += (this.cellsize);
                this.i++;
            }
        }
        if(blocks[this.i][this.j].fin){
            setup()
        }else{
            this.showBlocks(true)
        }
    }
    showBlocks(l){
        for(let i = max(0, this.i-this.radius);i<min(this.cellNumberX, this.i+this.radius);i++){
            for(let j = max(0, this.j-this.radius);j<min(this.cellNumberY, this.j+this.radius);j++){
                if (Math.sqrt((i-this.i)*(i-this.i)+(j-this.j)*(j-this.j))<this.radius){
                    blocks[i][j].isVisible(l)
                }
            }            
        }
    }
}