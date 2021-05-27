var canvas, ctx;
var W = window.innerWidth;
var H = window.innerHeight;


var r = 255, g = 255, b = 255;
var ind, prev_ind = 0;
var mode = true;
var clr;
var speed;
var stop = false;

var L = [[255, 0, 0], [0, 255, 0], [0, 0, 255],
[255, 0, 255], [128, 0, 128], [128, 0, 0], [0, 128, 0], [0, 255, 255],
[0, 0, 128], [138, 43, 226], [127, 255, 212], [255, 105, 180],
[255, 222, 173]];

var $ = function (id) { return document.getElementById(id) }

function init() {
  canvas = $('canvas');
  ctx = canvas.getContext('2d');
  canvas.style.background = "#ff69b4";
}

function rgbToHex(rr, gg, bb) {
  return "#" + ((1 << 24) + (rr << 16) + (gg << 8) + bb).toString(16).slice(1);
}

function game() {
  stop = false;
  hide_menu();
  engine();
}
function back() {
  stop = true;
  open_menu();
}

function engine() {
  if (stop) return;
  draww();
  requestAnimationFrame(engine);
}


function open_menu() {
  $('menu').hidden = false;
}

function hide_menu() {
  $('menu').hidden = true;
}


function change(c, nc) {
  if (nc - c > 0) {
    if (nc - c < speed) {
      c = nc;
    } else {
      c += speed;
    }
  } else if (nc - c < 0) {
    if (c - nc < speed) {
      c = nc;
    } else {
      c -= speed;
    }
  }
  return c;
}

function draww() {
  ctx.fillStyle = rgbToHex(r, g, b);
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  speed = parseInt($("slider").value);
  if (mode) {
    mode = false;
    do {
      ind = Math.floor(Math.random() * L.length);
    } while (ind == prev_ind);
    prev_ind = ind;
    clr = L[ind];
  }

  if (r == clr[0] && g == clr[1] && b == clr[2]) {
    mode = true;
  } else if (r != clr[0]) {
    r = change(r, clr[0]);
  }
  else if (g != clr[1]) {
    g = change(g, clr[1]);
  } else {
    b = change(b, clr[2]);
  }

  $("speedTxt").style.color = rgbToHex(255 - r, 255 - g, 255 - b);
  $("speedTxt2").style.color = rgbToHex(255 - r, 255 - g, 255 - b);
  $("speedTxt2").textContent = speed.toString();

  $("rgb").style.color = rgbToHex(255 - r, 255 - g, 255 - b);
  $("rgb").textContent = r.toString() + " " + g.toString() + " " + b.toString();
}
