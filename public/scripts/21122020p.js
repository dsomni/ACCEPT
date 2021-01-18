function div(a, b){
    return Math.floor(a/b);
}
class Player{
    constructor(width, height, cellsize, matrix){
        this.matrix = matrix;
        this.cellNumberX = width/cellsize;
        this.cellNumberY = height/cellsize;
        this.cellsize = cellsize;
        this.x=int(cellNumberX/2)*cellsize
        this.y=int(cellNumberY/2)*cellsize
        this.i=int(cellNumberX/2)
        this.j=int(cellNumberY/2)
        this.showSolution = false;
    }
    show(){
        fill(65);
        rect(this.x, this.y, this.cellsize);
        fill(0);
    }
    move(dir){
        if (dir=='p' || dir=='з'){
            if(this.showSolution){
                this.showSolution = false;
            }
            else{
                this.showSolution = true;
            }
        }
        if (dir == 'w' || dir == 'ц'){
            if(!this.matrix[this.i][this.j-1].solid){
                this.y -= (this.cellsize);
                this.j--;
            }
        }
        if(dir == 's'|| dir == 'ы'){
            if(!this.matrix[this.i][this.j+1].solid){
                this.y += (this.cellsize);
                this.j++;
            }
        }
        if(dir == 'a'|| dir == 'ф'){
            if(!this.matrix[this.i-1][this.j].solid){
                this.x -= (this.cellsize);
                this.i--;
            }
        }
        if(dir == 'd'|| dir == 'в'){
            if(!this.matrix[this.i+1][this.j].solid){
                this.x += (this.cellsize);
                this.i++;
            }
        }
        if(blocks[this.i][this.j].fin){
            setup()
        }
    }
}