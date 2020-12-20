assignText='\nassign (input,\'input.txt\'); reset(input);' \
       '\nassign (output,\'output.txt\'); rewrite(output);'
try:
    f = open('programText.txt','r')
    text = ''.join(f.readlines())

    idx1 = text.find('Begin')
    idx2 = text.find('begin')
    if((idx1<idx2  and idx1!=-1)or idx2==-1):
        idx = idx1
    else:
        idx = idx2
    text = text[:idx+5] + assignText + text[idx+5:]
    f = open('program.pas','w')
    f.write(text)
    f.close()
    print("Parsing is OK")
except:
    print("Error")

