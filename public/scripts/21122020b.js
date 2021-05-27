class Block {
  constructor(x, y, cellsize, cellNumberX, cellNumberY, isSolid) {
    this.x = x;
    this.y = y;
    this.cellsize = cellsize;
    this.solid = isSolid;
    this.path = false
    this.showP = false
    this.fin = false
    this.visible = false
    if (this.x / this.cellsize == cellNumberX - 1 && this.y / this.cellsize == cellNumberY - 1) {
      this.solid = false;
      this.fin = true
    }
    else if (this.x / this.cellsize == 0 && this.y / this.cellsize == cellNumberY - 1) {
      this.solid = false;
      this.fin = true
    }
    else if (this.x / this.cellsize == cellNumberX - 1 && this.y / this.cellsize == 0) {
      this.solid = false;
      this.fin = true
    }
    else if (this.x / this.cellsize == 0 && this.y / this.cellsize == 0) {
      this.solid = false;
      this.fin = true
    }
  }
  show() {
    if (this.visible || this.fin) {
      fill('#FFD240')
      if (this.solid) {
        fill('#00BD39');
      }
      if (this.fin) {
        fill(255, 0, 0);
      }
    } else {
      fill(0)
    }
    rect(this.x, this.y, this.cellsize)
    if (this.path && this.showP && this.visible) {
      fill(0, 0, 255);
      circle(this.x + this.cellsize / 2, this.y + this.cellsize / 2, this.cellsize / 3)
    }

  }
  ShoworHidePath() {
    if (this.showP) {
      this.showP = false
    } else {
      this.showP = true
    }
  }
  isVisible(vis) {
    this.visible = vis
  }
}
