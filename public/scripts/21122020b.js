class Block{
    constructor(x, y, cellsize,cellNumberX,cellNumberY, isSolid){
        this.x = x;
        this.y = y;
        this.cellsize = cellsize;
        this.solid = isSolid;
        this.fin = false
        if(this.x/this.cellsize==cellNumberX-1 && this.y/this.cellsize==cellNumberY-1 ){
            this.solid = false;
            this.fin = true
        }
        else if(this.x/this.cellsize==0 && this.y/this.cellsize==cellNumberY-1 ){
            this.solid = false;
            this.fin = true
        }
        else if(this.x/this.cellsize==cellNumberX-1 && this.y/this.cellsize==0 ){
            this.solid = false;
            this.fin = true
        }
        else if(this.x/this.cellsize==0 && this.y/this.cellsize==0 ){
            this.solid = false;
            this.fin = true
        }
    }
    show(){
        fill('#FFD240')
        if(this.solid){
            fill('#00BD39');
        }
        if(this.fin){
            fill(255,0,0);
        }
        rect(this.x, this.y, this.cellsize)
    }
}