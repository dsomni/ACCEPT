var i,j:integer;
Begin
assign (input,'public\checker\input.txt'); reset(input);
assign (output,'public\checker\output.txt'); rewrite(output);
readln(i,j);
writeln(i+j);
End.