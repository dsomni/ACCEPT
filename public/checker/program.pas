var a,b:integer;
Begin
assign (input,'public\checker\input.txt'); reset(input);
assign (output,'public\checker\output.txt'); rewrite(output);
read(a,b);
writeln(a-b);
End.