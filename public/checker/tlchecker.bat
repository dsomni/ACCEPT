del public\checker\TLlog.txt
del public\checker\output.txt
start public\checker\program.exe
timeout /t 1
taskkill /im program.exe >> public\checker\TLlog.txt
exit