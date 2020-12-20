assignText='\nassign (input,\'public\checker\input.txt\'); reset(input);' \
       '\nassign (output,\'public\checker\output.txt\'); rewrite(output);' \

try:
    f = open('public\checker\programText.txt','r')
    text = ''.join(f.readlines())

    idx = text.upper().find('BEGIN')
    if idx == -1:
        print(1)
    else:
        text = text[:idx+5] + assignText + text[idx+5:]
        f = open('public\checker\program.pas','w')
        f.write(text)
        f.close()
        print("Parsing is OK")
except:
    print(1)

